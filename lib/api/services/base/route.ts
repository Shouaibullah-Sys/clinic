// lib/api/services/base/route.ts - Base service template
import { NextRequest, NextResponse } from "next/server";
import { ServiceRegistry } from "@/lib/services/base.service";
import { 
  authorizeServiceAccess, 
  ServiceType 
} from "@/lib/auth.jwt";
import { ServiceActivityTracker } from "@/lib/middleware/activity-logger";

export abstract class BaseServiceRoute {
  protected serviceType: ServiceType;
  
  constructor(serviceType: ServiceType) {
    this.serviceType = serviceType;
  }

  protected async handleRequest(
    request: NextRequest,
    action: string,
    handler: (user: any, token: string) => Promise<any>,
    params?: any
  ) {
    try {
      // Get token from cookies or headers
      const token = request.cookies.get('accessToken')?.value || 
                    request.headers.get('authorization')?.replace('Bearer ', '');
      
      if (!token) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        );
      }

      // Authorize user for this service and action
      const user = await authorizeServiceAccess(request, this.serviceType, action as any);
      
      // Get service handler
      const service = ServiceRegistry.get(this.serviceType, request);
      
      // Execute handler
      const result = await handler(user, token);
      
      return NextResponse.json(result);
    } catch (error: any) {
      console.error(`${this.serviceType} service error:`, error);
      
      // Log service error
      await ServiceActivityTracker.trackServiceError(
        request,
        this.serviceType,
        action,
        'unknown',
        error,
        params?.id
      );
      
      if (error.message.includes('Unauthorized') || error.message.includes('permissions')) {
        return NextResponse.json(
          { error: error.message },
          { status: 403 }
        );
      }
      
      if (error.message.includes('not found')) {
        return NextResponse.json(
          { error: error.message },
          { status: 404 }
        );
      }
      
      return NextResponse.json(
        { error: error.message || `Failed to process ${this.serviceType} request` },
        { status: 500 }
      );
    }
  }
}