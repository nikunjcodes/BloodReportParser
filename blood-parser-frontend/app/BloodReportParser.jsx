"use client";
import React, { useState } from "react";
import {
  Upload,
  Download,
  AlertTriangle,
  FileText,
  Loader2,
  Check,
  X,
  FileWarning,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

const BloodReportParser = () => {
  const [file, setFile] = useState(null);
  const [parsedData, setParsedData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [processingStage, setProcessingStage] = useState(null);

  const handleFileUpload = async (event) => {
    const uploadedFile = event.target.files[0];
    if (!uploadedFile) return;

    // Validate file type
    const validTypes = [".pdf", ".png", ".jpg", ".jpeg"];
    const fileExtension =
      "." + uploadedFile.name.split(".").pop().toLowerCase();
    if (!validTypes.includes(fileExtension)) {
      setError("Invalid file type. Please upload PDF or image files only.");
      return;
    }

    setFile(uploadedFile);
    setLoading(true);
    setError(null);
    setUploadSuccess(false);
    setProcessingStage("Uploading file...");

    const formData = new FormData();
    formData.append("file", uploadedFile);

    try {
      setProcessingStage("Analyzing report...");
      const response = await fetch("http://localhost:8000/api/analyze-report", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to analyze report");
      }

      const data = await response.json();

      // Validate response data
      if (!data || Object.keys(data).length === 0) {
        throw new Error("No data could be extracted from the report");
      }

      console.log("Analyzed data:", data);
      setParsedData(data);
      setUploadSuccess(true);
      setProcessingStage(null);
    } catch (err) {
      setError(err.message || "Failed to analyze report. Please try again.");
      setParsedData(null);
    } finally {
      setLoading(false);
    }
  };

  const downloadReport = () => {
    if (!parsedData) return;
    const reportContent = JSON.stringify(parsedData, null, 2);
    const blob = new Blob([reportContent], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "analyzed-blood-report.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-5xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Blood Report Analyzer
          </h1>
          <p className="text-gray-600">
            Upload your blood report for AI-powered analysis
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Upload Section */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Upload Report</CardTitle>
              <CardDescription>
                Supported formats: PDF, PNG, JPG
                {processingStage && (
                  <Badge variant="outline" className="ml-2">
                    {processingStage}
                  </Badge>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <label className="flex flex-col items-center justify-center h-40 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                  <div className="flex flex-col items-center">
                    {loading ? (
                      <>
                        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                        <span className="mt-2 text-sm text-blue-500">
                          {processingStage}
                        </span>
                      </>
                    ) : uploadSuccess ? (
                      <Check className="w-8 h-8 text-green-500" />
                    ) : error ? (
                      <FileWarning className="w-8 h-8 text-red-500" />
                    ) : (
                      <Upload className="w-8 h-8 text-gray-400" />
                    )}
                    <span className="mt-2 text-sm text-gray-500">
                      {!loading && "Click to upload report"}
                    </span>
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.png,.jpg,.jpeg"
                    onChange={handleFileUpload}
                    disabled={loading}
                  />
                </label>

                {file && (
                  <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div className="flex items-center space-x-2">
                      <FileText className="w-4 h-4 text-gray-500" />
                      <span className="text-sm text-gray-700 truncate">
                        {file.name}
                      </span>
                    </div>
                    {uploadSuccess && (
                      <button
                        onClick={downloadReport}
                        className="text-blue-500 hover:text-blue-600"
                        title="Download analyzed report"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                )}

                {error && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Results Section */}
          <div className="lg:col-span-3 space-y-6">
            {parsedData && (
              <>
                <PatientCard data={parsedData.patientInfo} />
                <ResultsCard
                  abnormalResults={parsedData.abnormalResults}
                  allResults={parsedData.allResults}
                />
                <RecommendationsCard data={parsedData.recommendations} />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const PatientCard = ({ data }) => {
  if (!data || Object.keys(data).length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Patient Information</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          {Object.entries(data).map(([key, value]) => (
            <div key={key} className="flex flex-col">
              <span className="text-sm text-gray-500 capitalize">{key}</span>
              <span className="font-medium">{value || "N/A"}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

const ResultsCard = ({ abnormalResults, allResults }) => {
  const [showAll, setShowAll] = useState(false);

  if (!abnormalResults?.length && !allResults?.length) return null;

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Test Results</CardTitle>
          <button
            onClick={() => setShowAll(!showAll)}
            className="text-sm text-blue-500 hover:text-blue-600"
          >
            Show {showAll ? "Abnormal Only" : "All Results"}
          </button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Abnormal Results */}
          {abnormalResults?.length > 0 && (
            <div className="space-y-2">
              {abnormalResults.map((result, index) => (
                <div
                  key={index}
                  className="flex justify-between items-center p-3 bg-red-50 rounded-lg"
                >
                  <div>
                    <span className="font-medium">{result.parameter}</span>
                    <p className="text-sm text-red-600">
                      {result.interpretation}
                    </p>
                  </div>
                  <span className="font-bold">
                    {result.value} {result.unit}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* All Results */}
          {showAll && allResults?.length > 0 && (
            <div className="mt-4 space-y-2">
              {allResults.map((result, index) => (
                <div
                  key={index}
                  className={`flex justify-between items-center p-3 rounded-lg ${
                    result.status === "abnormal" ? "bg-red-50" : "bg-gray-50"
                  }`}
                >
                  <span>{result.parameter}</span>
                  <div className="text-right">
                    <span className="font-medium">
                      {result.value} {result.unit}
                    </span>
                    <p className="text-sm text-gray-500">
                      Range: {result.referenceRange || "N/A"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

const RecommendationsCard = ({ data }) => {
  if (!data?.length) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recommendations</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {data.map((recommendation, index) => (
            <li key={index} className="flex items-start gap-2">
              <div className="min-w-4 mt-1">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              </div>
              <span className="text-gray-700">{recommendation}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
};

export default BloodReportParser;
