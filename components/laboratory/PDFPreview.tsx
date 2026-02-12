// components/laboratory/PDFPreview.tsx
"use client";

import { useState } from "react";
import { CanvasFractalGrid } from "@/components/ui/canvas-fractal-grid";
import { Button } from "@/components/ui/button";
import { LabTest, generateLabTestPDF } from "@/lib/pdf-generator";
import { format } from "date-fns";
import {
  FileText,
  User,
  Stethoscope,
  TestTube,
  AlertCircle,
  CheckCircle,
  Clock,
} from "lucide-react";

interface PDFPreviewProps {
  test: LabTest;
  backgroundConfig?: {
    dotSize?: number;
    dotSpacing?: number;
    dotOpacity?: number;
    gradientAnimationDuration?: number;
    waveIntensity?: number;
    waveRadius?: number;
    enableNoise?: boolean;
    noiseOpacity?: number;
    enableMouseGlow?: boolean;
    initialPerformance?: "low" | "medium" | "high";
    enableGradient?: boolean;
  };
}

const PDFPreview = ({ test, backgroundConfig }: PDFPreviewProps) => {
  const [scale, setScale] = useState(0.8);

  // Mock PDF content - you can replace this with actual PDF rendering logic
  const renderPDFContent = () => {
    const doctorInfo = test.doctor || {
      name: "Unknown Doctor",
      specialization: "N/A",
    };
    const patientInfo = test.patient || {
      name: "Unknown Patient",
      patientId: "N/A",
      phone: "N/A",
    };

    return (
      <div className="bg-white text-gray-800 p-8 min-h-200 shadow-xl">
        {/* Header */}
        <div className="flex justify-between items-start border-b pb-4 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <FileText className="h-6 w-6 text-blue-600" />
              <h1 className="text-2xl font-bold">LABORATORY TEST REPORT</h1>
            </div>
            <p className="text-sm text-gray-600">
              Certificate of Laboratory Analysis
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-500">Report ID</div>
            <div className="text-lg font-mono font-bold">{test.testId}</div>
            <div className="text-xs text-gray-500 mt-1">
              Generated: {format(new Date(), "MMM dd, yyyy HH:mm")}
            </div>
          </div>
        </div>

        {/* Patient & Doctor Info */}
        <div className="grid grid-cols-2 gap-6 mb-8">
          <div className="border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <User className="h-5 w-5 text-blue-600" />
              <h2 className="font-semibold">PATIENT INFORMATION</h2>
            </div>
            <div className="space-y-2">
              <div>
                <span className="text-sm text-gray-600">Name:</span>
                <span className="ml-2 font-medium">{patientInfo.name}</span>
              </div>
              <div>
                <span className="text-sm text-gray-600">Patient ID:</span>
                <span className="ml-2 font-mono">{patientInfo.patientId}</span>
              </div>
              <div>
                <span className="text-sm text-gray-600">Phone:</span>
                <span className="ml-2">{patientInfo.phone}</span>
              </div>
            </div>
          </div>

          <div className="border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Stethoscope className="h-5 w-5 text-green-600" />
              <h2 className="font-semibold">REFERRING DOCTOR</h2>
            </div>
            <div className="space-y-2">
              <div>
                <span className="text-sm text-gray-600">Doctor:</span>
                <span className="ml-2 font-medium">Dr. {doctorInfo.name}</span>
              </div>
              <div>
                <span className="text-sm text-gray-600">Specialization:</span>
                <span className="ml-2">{doctorInfo.specialization}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Test Details */}
        <div className="border rounded-lg p-4 mb-8">
          <div className="flex items-center gap-2 mb-4">
            <TestTube className="h-5 w-5 text-purple-600" />
            <h2 className="font-semibold">TEST DETAILS</h2>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="text-sm text-gray-600">Test Name</div>
              <div className="font-medium">{test.testName}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Category</div>
              <div className="font-medium">{test.category}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Priority</div>
              <div
                className={`font-medium ${
                  test.priority === "emergency"
                    ? "text-red-600"
                    : test.priority === "urgent"
                      ? "text-orange-600"
                      : "text-blue-600"
                }`}
              >
                {test.priority?.toUpperCase()}
              </div>
            </div>
          </div>
        </div>

        {/* Results Section */}
        <div className="border rounded-lg p-4 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-green-600" />
              <h2 className="font-semibold">TEST RESULTS</h2>
            </div>
            <div
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                test.status === "completed"
                  ? "bg-green-100 text-green-800"
                  : test.status === "reported"
                    ? "bg-blue-100 text-blue-800"
                    : "bg-yellow-100 text-yellow-800"
              }`}
            >
              {test.status?.toUpperCase()}
            </div>
          </div>

          {test.results?.parameters ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="py-3 px-4 text-left font-medium">
                      Parameter
                    </th>
                    <th className="py-3 px-4 text-left font-medium">Result</th>
                    <th className="py-3 px-4 text-left font-medium">Unit</th>
                    <th className="py-3 px-4 text-left font-medium">
                      Reference Range
                    </th>
                    <th className="py-3 px-4 text-left font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {test.results.parameters.map((param: any, index: number) => (
                    <tr
                      key={index}
                      className={index % 2 === 0 ? "bg-gray-50" : "bg-white"}
                    >
                      <td className="py-3 px-4 border-b">{param.name}</td>
                      <td className="py-3 px-4 border-b font-medium">
                        {param.value}
                      </td>
                      <td className="py-3 px-4 border-b">{param.unit}</td>
                      <td className="py-3 px-4 border-b">
                        {param.referenceRange}
                      </td>
                      <td className="py-3 px-4 border-b">
                        <span
                          className={`inline-flex items-center gap-1 ${
                            param.status === "normal"
                              ? "text-green-600"
                              : param.status === "abnormal"
                                ? "text-red-600"
                                : "text-yellow-600"
                          }`}
                        >
                          {param.status === "normal" ? (
                            <CheckCircle className="h-4 w-4" />
                          ) : (
                            <AlertCircle className="h-4 w-4" />
                          )}
                          {param.status?.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Clock className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p>Results pending or not available</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t pt-6">
          <div className="grid grid-cols-3 gap-6">
            <div>
              <h3 className="font-semibold mb-2">TEST NOTES</h3>
              <p className="text-sm text-gray-600">
                {test.results?.interpretation ||
                  "No additional notes provided."}
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">TECHNOLOGIST</h3>
              <p className="text-sm">[Technologist Name]</p>
              <p className="text-xs text-gray-500">
                Certified Laboratory Technologist
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">VERIFICATION</h3>
              <p className="text-sm">[Pathologist Name]</p>
              <p className="text-xs text-gray-500">
                Board Certified Pathologist
              </p>
            </div>
          </div>

          <div className="mt-6 text-center text-xs text-gray-500">
            <p>
              This is an electronically generated report. No signature is
              required.
            </p>
            <p className="mt-1">
              Report valid for medical purposes. Confidential document.
            </p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="relative">
      {/* Background with CanvasFractalGrid */}
      <div className="fixed inset-0 -z-10">
        <CanvasFractalGrid {...backgroundConfig} />
      </div>

      {/* PDF Content Container */}
      <div className="relative">
        {/* Scale Controls */}
        <div className="flex justify-end items-center gap-2 mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setScale(Math.max(0.5, scale - 0.1))}
            disabled={scale <= 0.5}
          >
            -
          </Button>
          <span className="text-sm w-16 text-center">
            {Math.round(scale * 100)}%
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setScale(Math.min(1.5, scale + 0.1))}
            disabled={scale >= 1.5}
          >
            +
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setScale(0.8)}
            className="ml-4"
          >
            Reset Zoom
          </Button>
        </div>

        {/* PDF Preview */}
        <div className="overflow-auto bg-gray-100 p-4 rounded-lg border">
          <div
            className="mx-auto"
            style={{
              transform: `scale(${scale})`,
              transformOrigin: "top center",
              width: `${100 / scale}%`,
            }}
          >
            {renderPDFContent()}
          </div>
        </div>

        {/* Preview Actions */}
        <div className="flex justify-between items-center mt-4 p-4 bg-white/80 backdrop-blur-sm rounded-lg border">
          <div className="text-sm text-gray-600">
            This is a preview. Actual PDF will be generated with the same
            background.
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              Print Preview
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={async () => {
                try {
                  await generateLabTestPDF(test, "download");
                } catch (error) {
                  console.error("Failed to generate PDF:", error);
                }
              }}
            >
              Generate PDF
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PDFPreview;
