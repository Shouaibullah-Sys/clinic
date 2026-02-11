// lib/services/ambulance.service.ts
import { NextRequest } from "next/server";
import { BaseService, ServiceError, ServiceRegistry } from "./base.service";
import { ServiceActivityTracker } from "@/lib/middleware/activity-logger";
import {
  IAmbulanceService,
  AmbulanceService,
} from "@/lib/models/AmbulanceService";
import { IUser } from "@/lib/models/User";

export class AmbulanceServiceHandler extends BaseService {
  async createAmbulanceTrip(
    token: string,
    data: Partial<IAmbulanceService>,
  ): Promise<IAmbulanceService> {
    const { user } = await this.validateAndAuthorize(
      token,
      "patients",
      "create",
    );

    await this.checkServiceAccess(user, "ambulance", "create");

    // Validate required fields
    if (!data.patient || !data.pickupLocation) {
      throw new ServiceError("Patient and pickup location are required", 400);
    }

    // Log service access
    if (this.request) {
      await ServiceActivityTracker.trackServiceAccess(
        this.request,
        "ambulance",
        "create",
        user._id,
      );
    }

    const ambulanceRecord = await AmbulanceService.create({
      ...data,
      status: "dispatched",
      pickupTime: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await this.auditLog(
      "create",
      "ambulance_trip",
      ambulanceRecord._id.toString(),
      user._id,
      user.role,
      { data },
    );

    return ambulanceRecord;
  }

  async getAmbulanceTrip(
    token: string,
    tripId: string,
  ): Promise<IAmbulanceService> {
    const { user } = await this.authenticate(token);

    // Log service access
    if (this.request) {
      await ServiceActivityTracker.trackServiceAccess(
        this.request,
        "ambulance",
        "read",
        user._id,
        tripId,
      );
    }

    const trip = await AmbulanceService.findById(tripId)
      .populate("patient", "name age gender")
      .populate("driver", "name designation")
      .populate("department", "name");

    if (!trip) {
      // Log not found error
      if (this.request) {
        await ServiceActivityTracker.trackServiceError(
          this.request,
          "ambulance",
          "read",
          user._id,
          new Error("Ambulance trip not found"),
          tripId,
        );
      }

      throw new ServiceError("Ambulance trip not found", 404);
    }

    // Check access permissions
    if (user.role !== "admin" && trip.driver?.toString() !== user._id) {
      await this.authorize(user, "patients", "read");
    }

    return trip;
  }

  async updateTripStatus(
    token: string,
    tripId: string,
    status: "dispatched" | "in_transit" | "arrived" | "completed" | "cancelled",
    location?: { lat: number; lng: number; address?: string },
  ): Promise<IAmbulanceService> {
    const { user } = await this.validateAndAuthorize(
      token,
      "patients",
      "update",
    );

    const trip = await AmbulanceService.findById(tripId);
    if (!trip) {
      throw new ServiceError("Ambulance trip not found", 404);
    }

    // Check if user is authorized to update this trip
    if (user.role !== "admin" && trip.driver?.toString() !== user._id) {
      // Log unauthorized update attempt
      if (this.request) {
        await ServiceActivityTracker.trackServiceError(
          this.request,
          "ambulance",
          "update",
          user._id,
          new Error("Not authorized to update this trip"),
          tripId,
        );
      }

      throw new ServiceError("Not authorized to update this trip", 403);
    }

    const previousState = { ...trip.toObject() };

    trip.status = status;
    if (location) {
      trip.currentLocation = location;
    }

    if (status === "arrived") {
      trip.arrivalTime = new Date();
    } else if (status === "completed") {
      trip.handoverTime = new Date();
    }

    trip.updatedAt = new Date();
    await trip.save();

    // Log successful update
    if (this.request) {
      await ServiceActivityTracker.trackDataChange(
        this.request,
        "ambulance",
        "update",
        user._id,
        tripId,
        { status, location },
        previousState,
      );
    }

    await this.auditLog(
      "update",
      "ambulance_trip",
      trip._id.toString(),
      user._id,
      user.role,
      {
        previousState,
        newState: trip.toObject(),
        changes: { status, location },
      },
    );

    return trip;
  }

  async listAmbulanceTrips(
    token: string,
    filters: any = {},
    options: {
      page?: number;
      limit?: number;
      sort?: any;
    } = {},
  ): Promise<{
    trips: IAmbulanceService[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const { user } = await this.authenticate(token);
    const { page = 1, limit = 20, sort = { createdAt: -1 } } = options;

    // Log list access
    if (this.request) {
      await ServiceActivityTracker.trackServiceAccess(
        this.request,
        "ambulance",
        "list",
        user._id,
      );
    }

    // Build query based on user role
    let query: any = {};

    if (user.role === "nurse" || user.role === "staff") {
      query = {
        $or: [
          { driver: user._id },
          { status: { $in: ["dispatched", "in_transit"] } },
        ],
      };
    } else if (user.role === "receptionist") {
      query = { status: { $in: ["dispatched", "in_transit", "arrived"] } };
    }

    // Apply additional filters
    query = { ...query, ...filters };

    const total = await AmbulanceService.countDocuments(query);
    const trips = await AmbulanceService.find(query)
      .populate("patient", "name age gender")
      .populate("driver", "name designation")
      .skip((page - 1) * limit)
      .limit(limit)
      .sort(sort);

    return {
      trips,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async deleteAmbulanceTrip(token: string, tripId: string): Promise<void> {
    const { user } = await this.validateAndAuthorize(
      token,
      "patients",
      "delete",
    );

    if (user.role !== "admin") {
      // Log unauthorized delete attempt
      if (this.request) {
        await ServiceActivityTracker.trackServiceError(
          this.request,
          "ambulance",
          "delete",
          user._id,
          new Error("Only administrators can delete trips"),
          tripId,
        );
      }

      throw new ServiceError("Only administrators can delete trips", 403);
    }

    const trip = await AmbulanceService.findById(tripId);
    if (!trip) {
      throw new ServiceError("Trip not found", 404);
    }

    // Log deletion
    if (this.request) {
      await ServiceActivityTracker.trackDataChange(
        this.request,
        "ambulance",
        "delete",
        user._id,
        tripId,
        { status: "cancelled" },
        trip.toObject(),
      );
    }

    // Soft delete
    trip.status = "cancelled";
    trip.updatedAt = new Date();
    await trip.save();

    await this.auditLog(
      "delete",
      "ambulance_trip",
      tripId,
      user._id,
      user.role,
      { trip: trip.toObject() },
    );
  }

  // Statistics and reports
  async getStatistics(
    token: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<any> {
    const { user } = await this.authenticate(token);

    if (user.role !== "admin") {
      throw new ServiceError("Only administrators can view statistics", 403);
    }

    const query: any = {};
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = startDate;
      if (endDate) query.createdAt.$lte = endDate;
    }

    const [totalTrips, completedTrips, cancelledTrips, activeTrips] =
      await Promise.all([
        AmbulanceService.countDocuments(query),
        AmbulanceService.countDocuments({ ...query, status: "completed" }),
        AmbulanceService.countDocuments({ ...query, status: "cancelled" }),
        AmbulanceService.countDocuments({
          ...query,
          status: { $in: ["dispatched", "in_transit", "arrived"] },
        }),
      ]);

    // Log statistics access
    if (this.request) {
      await ServiceActivityTracker.trackServiceAccess(
        this.request,
        "ambulance",
        "statistics",
        user._id,
      );
    }

    return {
      totalTrips,
      completedTrips,
      cancelledTrips,
      activeTrips,
      completionRate: totalTrips > 0 ? (completedTrips / totalTrips) * 100 : 0,
    };
  }
}

// Register the service
ServiceRegistry.register("ambulance", new AmbulanceServiceHandler());
