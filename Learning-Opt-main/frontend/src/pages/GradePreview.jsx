import React, { useState, useEffect } from "react";
import { useAuth } from "../utils/auth";
import { useNavigate } from "react-router-dom";
import Dashboard from "../components/Dashboard";
import axios from "axios";

function GradePreview() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  // Original GradePreview state
  const [students, setStudents] = useState([]);
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState("");
  // CHANGED: Store top performers by department
  const [toppers, setToppers] = useState({});
  const [activeDept, setActiveDept] = useState("TECHNICAL");
  const [isUploading, setIsUploading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // New state for tabs and history
  const [activeTab, setActiveTab] = useState("create");

  // Generated Files state
  const [generatedFiles, setGeneratedFiles] = useState([]);
  const [loadingFiles, setLoadingFiles] = useState(true);
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedFileStudents, setSelectedFileStudents] = useState([]);
  const [isEditingHistory, setIsEditingHistory] = useState(false);
  const [historyActiveDept, setHistoryActiveDept] = useState("TECHNICAL");
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [originalFileStudents, setOriginalFileStudents] = useState([]);

  // CHANGED: Store history top performers by department
  const [historyToppers, setHistoryToppers] = useState({});

  const [showFilesPopup, setShowFilesPopup] = useState(false);

  const API_BASE = "http://localhost:5000";

  const fetchGeneratedFiles = async () => {
    setLoadingFiles(true);
    try {
      const response = await fetch(`${API_BASE}/api/generated-files`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setGeneratedFiles(data.files || []);
    } catch (error) {
      console.error("Error fetching generated files:", error);
      setGeneratedFiles([]);
    } finally {
      setLoadingFiles(false);
    }
  };

  // Helper function to get field limits based on the grading table
  const getFieldLimits = (field) => {
    if (field === "over_all") {
      return { min: 0, max: 5, step: 0.1 };
    }

    // Specific limits for each field based on the grading table
    const fieldLimits = {
      // NTOP group
      WI: { min: 0, max: 10, step: 1 },
      CO: { min: 0, max: 10, step: 1 },
      "5S": { min: 0, max: 5, step: 1 },
      BO: { min: 0, max: 10, step: 1 },
      CBO: { min: 0, max: 5, step: 1 },
      SDG: { min: 0, max: 5, step: 1 },

      // WVS group
      OHSA: { min: 0, max: 20, step: 1 },
      WE: { min: 0, max: 10, step: 1 },
      UJC: { min: 0, max: 15, step: 1 },
      ISO: { min: 0, max: 10, step: 1 },
      PO: { min: 0, max: 15, step: 1 },
      HR: { min: 0, max: 10, step: 1 },

      // EQUIP group
      AppDev: { min: 0, max: 20, step: 1 }, // TECHNICAL
      PerDev: { min: 0, max: 10, step: 1 }, // SUPPORT
      WI2: { min: 0, max: 5, step: 1 }, // PRODUCTION
      ELEX: { min: 0, max: 10, step: 1 }, // PRODUCTION
      CM: { min: 0, max: 10, step: 1 }, // PRODUCTION
      SPC: { min: 0, max: 10, step: 1 }, // PRODUCTION

      // ASSESSMENT group
      SUPP: { min: 0, max: 40, step: 1 }, // SUPPORT
      Tech: { min: 0, max: 46, step: 1 }, // TECHNICAL
      PROD: { min: 0, max: 40, step: 1 }, // PRODUCTION
      DS: { min: 0, max: 10, step: 1 }, // All departments
    };

    return fieldLimits[field] || { min: 0, max: 10, step: 1 };
  };

  // CHANGED: Helper function to calculate top performers by department
  const calculateTopPerformers = (studentList) => {
    const departments = ["TECHNICAL", "PRODUCTION", "SUPPORT"];
    const toppers = {};

    departments.forEach((dept) => {
      const deptStudents = studentList.filter((s) => {
        const studentDept = s.department?.trim().toUpperCase() || "";
        if (dept === "TECHNICAL") {
          return studentDept === "TECHNICAL" || studentDept === "IT";
        }
        if (dept === "PRODUCTION") {
          return studentDept === "PRODUCTION" || studentDept === "PROD";
        }
        if (dept === "SUPPORT") {
          return (
            studentDept !== "TECHNICAL" &&
            studentDept !== "IT" &&
            studentDept !== "PRODUCTION" &&
            studentDept !== "PROD"
          );
        }
        return false;
      });

      const studentsWithGrades = deptStudents.filter(
        (s) => s.over_all && Number(s.over_all) > 0
      );

      if (studentsWithGrades.length > 0) {
        toppers[dept] = studentsWithGrades.reduce((prev, current) =>
          Number(current.over_all) > Number(prev.over_all) ? current : prev
        );
      } else {
        toppers[dept] = null;
      }
    });

    return toppers;
  };

  const handleUpload = async () => {
    if (!file) {
      alert("Please select a file first.");
      return;
    }

    setIsUploading(true);
    const form = new FormData();
    form.append("file", file);

    try {
      const res = await axios.post(
        "http://localhost:5000/upload/trainee",
        form
      );

      console.log("Upload response:", res.data);

      if (!res.data.students || res.data.students.length === 0) {
        throw new Error("No student data received from upload");
      }

      const studentsData = res.data.students;
      const dataWithGrades = studentsData.map((student) => {
        const dept = student.department?.trim().toUpperCase();
        const gradeCount =
          dept === "PRODUCTION" || dept === "Production" ? 18 : 15;

        return {
          ...student,
          ...Object.fromEntries(
            Array.from({ length: gradeCount }, (_, i) => [`${i + 1}G`, ""])
          ),
        };
      });

      // Use original filename without extension
      const baseFileName = file.name.replace(/\.[^/.]+$/, "");
      const reportData = {
        students: dataWithGrades,
        originalFileName: baseFileName,
        // ADD: Include metadata from the first student if available
        date_of_immersion: dataWithGrades[0]?.date_of_immersion || "",
        batch: dataWithGrades[0]?.batch || "",
        school: dataWithGrades[0]?.school || "",
      };

      const excelRes = await axios.post(
        "http://localhost:5000/api/generate/excel",
        reportData
      );

      console.log("Excel generation response:", excelRes.data);

      if (excelRes.data && excelRes.data.message) {
        setFile(null);
        setFileName("");
        await fetchGeneratedFiles();
        setActiveTab("history");

        alert(
          `File uploaded successfully!\n\nFile: ${excelRes.data.filename}\nStudents processed: ${excelRes.data.students_processed}\n\nThe file has been saved to Generated Files History.`
        );
      } else {
        throw new Error(
          "Excel generation failed - no success message received"
        );
      }
    } catch (err) {
      console.error("Upload error:", err);

      let errorMessage = "Upload failed. Please try again.";

      if (err.response && err.response.data && err.response.data.error) {
        errorMessage = `Upload failed: ${err.response.data.error}`;
      } else if (err.message) {
        errorMessage = `Upload failed: ${err.message}`;
      }

      alert(errorMessage);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveFile = () => {
    setFile(null);
    setFileName("");
  };

  const handleGradeChange = (index, field, value) => {
    const updated = [...students];
    const limits = getFieldLimits(field);

    if (field === "over_all") {
      if (value === "" || /^\d*\.?\d{0,1}$/.test(value)) {
        const numValue = parseFloat(value);
        if (
          value === "" ||
          (numValue >= limits.min && numValue <= limits.max)
        ) {
          updated[index][field] = value;
        }
      }
    } else {
      if (value === "" || /^\d+$/.test(value)) {
        const numValue = parseInt(value);
        if (
          value === "" ||
          (numValue >= limits.min && numValue <= limits.max)
        ) {
          updated[index][field] = value;
        }
      }
    }

    setStudents(updated);

    // Calculate top performers by department
    const newToppers = calculateTopPerformers(updated);
    setToppers(newToppers);
  };

  // History-specific grade change handler
  const handleHistoryGradeChange = (studentIndex, field, value) => {
    const updated = [...selectedFileStudents];
    const limits = getFieldLimits(field);

    if (field === "over_all") {
      if (value === "" || /^\d*\.?\d{0,1}$/.test(value)) {
        const numValue = parseFloat(value);
        if (
          value === "" ||
          (numValue >= limits.min && numValue <= limits.max)
        ) {
          // Keep as string to preserve decimal inputs, but convert empty to empty string
          updated[studentIndex][field] = value === "" ? "" : value;
        }
      }
    } else {
      if (value === "" || /^\d+$/.test(value)) {
        const numValue = parseInt(value);
        if (
          value === "" ||
          (numValue >= limits.min && numValue <= limits.max)
        ) {
          // Keep as string to preserve user input, convert empty to empty string
          updated[studentIndex][field] = value === "" ? "" : value;
        }
      }
    }

    setSelectedFileStudents(updated);

    // Calculate history top performers by department
    const newHistoryToppers = calculateTopPerformers(updated);
    setHistoryToppers(newHistoryToppers);
  };

  const departments = ["TECHNICAL", "PRODUCTION", "SUPPORT"];

  const filteredStudents = students.filter((s) => {
    const dept = s.department?.trim().toUpperCase() || "";
    if (activeDept === "TECHNICAL") {
      return dept === "TECHNICAL" || dept === "IT";
    }
    if (activeDept === "PRODUCTION") {
      return dept === "PRODUCTION" || dept === "PROD";
    }
    if (activeDept === "SUPPORT") {
      return (
        dept !== "TECHNICAL" &&
        dept !== "IT" &&
        dept !== "PRODUCTION" &&
        dept !== "PROD"
      );
    }
    return false;
  });

  const filteredHistoryStudents = selectedFileStudents.filter((s) => {
    const dept = s.department?.trim().toUpperCase() || "";
    if (historyActiveDept === "TECHNICAL") {
      return dept === "TECHNICAL" || dept === "IT";
    }
    if (historyActiveDept === "PRODUCTION") {
      return dept === "PRODUCTION" || dept === "PROD";
    }
    if (historyActiveDept === "SUPPORT") {
      return (
        dept !== "TECHNICAL" &&
        dept !== "IT" &&
        dept !== "PRODUCTION" &&
        dept !== "PROD"
      );
    }
    return false;
  });

  const gradingStructures = {
    PRODUCTION: {
      groups: [
        { label: "NTOP", fields: ["WI", "CO", "5S", "BO", "CBO", "SDG"] },
        { label: "WVS", fields: ["OHSA", "WE", "UJC", "ISO", "PO", "HR"] },
        { label: "EQUIP", fields: ["WI2", "ELEX", "CM", "SPC"] },
        { label: "ASSESSMENT", fields: ["PROD", "DS"] },
      ],
    },
    SUPPORT: {
      groups: [
        { label: "NTOP", fields: ["WI", "CO", "5S", "BO", "CBO", "SDG"] },
        { label: "WVS", fields: ["OHSA", "WE", "UJC", "ISO", "PO", "HR"] },
        { label: "EQUIP", fields: ["PerDev"] },
        { label: "ASSESSMENT", fields: ["Supp", "DS"] },
      ],
    },
    TECHNICAL: {
      groups: [
        { label: "NTOP", fields: ["WI", "CO", "5S", "BO", "CBO", "SDG"] },
        { label: "WVS", fields: ["OHSA", "WE", "UJC", "ISO", "PO", "HR"] },
        { label: "EQUIP", fields: ["AppDev"] },
        { label: "ASSESSMENT", fields: ["Tech", "DS"] },
      ],
    },
  };

  const handleGenerateHistoryExcel = async () => {
    if (!selectedFile || selectedFileStudents.length === 0) {
      alert("No student data available.");
      return;
    }

    setIsGenerating(true);
    try {
      // ADD: Include the file's metadata in the request
      const studentsWithMetadata = selectedFileStudents.map((student) => ({
        ...student,
        // Ensure each student has the file's metadata
        date_of_immersion: selectedFile.date_of_immersion,
        batch: selectedFile.batch,
        school: selectedFile.school,
      }));

      const reportData = {
        students: studentsWithMetadata, // Use the enhanced student data
        originalFileName:
          selectedFile.original_filename ||
          selectedFile.filename.replace(/\.[^/.]+$/, ""),
        // ADD: Include top-level metadata as backup
        date_of_immersion: selectedFile.date_of_immersion,
        batch: selectedFile.batch,
        school: selectedFile.school,
      };

      const res = await axios.post(
        "http://localhost:5000/api/generate/excel",
        reportData,
        { responseType: "blob" }
      );

      const disposition = res.headers["content-disposition"];
      let filename = `${
        selectedFile.original_filename ||
        selectedFile.filename.replace(/\.[^/.]+$/, "")
      }-UPDATED-REPORT.xlsx`;
      if (disposition) {
        const match = disposition.match(/filename="?([^"]+)"?/);
        if (match && match[1]) {
          filename = match[1];
        }
      }

      const blob = new Blob([res.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      alert("Excel report generated successfully with updated data!");
    } catch (err) {
      console.error(err);
      alert("Download failed. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const fetchFileDetails = async (fileId) => {
    try {
      const response = await fetch(`${API_BASE}/api/generated-files/${fileId}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();

      // Ensure all grade fields exist with proper values - convert null to empty string for inputs
      const studentsWithDefaults = (data.students || []).map((student) => ({
        ...student,
        // Convert null values to empty strings for form inputs
        over_all:
          student.over_all === null || student.over_all === undefined
            ? ""
            : String(student.over_all),
        WI:
          student.WI === null || student.WI === undefined
            ? ""
            : String(student.WI),
        CO:
          student.CO === null || student.CO === undefined
            ? ""
            : String(student.CO),
        "5S":
          student["5S"] === null || student["5S"] === undefined
            ? ""
            : String(student["5S"]),
        BO:
          student.BO === null || student.BO === undefined
            ? ""
            : String(student.BO),
        CBO:
          student.CBO === null || student.CBO === undefined
            ? ""
            : String(student.CBO),
        SDG:
          student.SDG === null || student.SDG === undefined
            ? ""
            : String(student.SDG),
        OHSA:
          student.OHSA === null || student.OHSA === undefined
            ? ""
            : String(student.OHSA),
        WE:
          student.WE === null || student.WE === undefined
            ? ""
            : String(student.WE),
        UJC:
          student.UJC === null || student.UJC === undefined
            ? ""
            : String(student.UJC),
        ISO:
          student.ISO === null || student.ISO === undefined
            ? ""
            : String(student.ISO),
        PO:
          student.PO === null || student.PO === undefined
            ? ""
            : String(student.PO),
        HR:
          student.HR === null || student.HR === undefined
            ? ""
            : String(student.HR),
        DS:
          student.DS === null || student.DS === undefined
            ? ""
            : String(student.DS),
        WI2:
          student.WI2 === null || student.WI2 === undefined
            ? ""
            : String(student.WI2),
        ELEX:
          student.ELEX === null || student.ELEX === undefined
            ? ""
            : String(student.ELEX),
        CM:
          student.CM === null || student.CM === undefined
            ? ""
            : String(student.CM),
        SPC:
          student.SPC === null || student.SPC === undefined
            ? ""
            : String(student.SPC),
        PROD:
          student.PROD === null || student.PROD === undefined
            ? ""
            : String(student.PROD),
        PerDev:
          student.PerDev === null || student.PerDev === undefined
            ? ""
            : String(student.PerDev),
        Supp:
          student.Supp === null || student.Supp === undefined
            ? ""
            : String(student.Supp),
        AppDev:
          student.AppDev === null || student.AppDev === undefined
            ? ""
            : String(student.AppDev),
        Tech:
          student.Tech === null || student.Tech === undefined
            ? ""
            : String(student.Tech),
      }));

      // Store both original and current data
      setOriginalFileStudents(JSON.parse(JSON.stringify(studentsWithDefaults))); // Deep copy for original
      setSelectedFileStudents(studentsWithDefaults);
      setSelectedFile(data.file);
      setShowFilesPopup(false);

      const newHistoryToppers = calculateTopPerformers(studentsWithDefaults);
      setHistoryToppers(newHistoryToppers);
    } catch (error) {
      console.error("Error fetching file details:", error);
      alert("Failed to fetch file details: " + error.message);
    }
  };
  // Rest of the functions remain the same...
  const updateFile = async () => {
    if (!selectedFile) return;

    setIsUpdating(true);
    try {
      console.log("Updating file with students:", selectedFileStudents.length);

      const response = await fetch(
        `${API_BASE}/api/generated-files/${selectedFile.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            students: selectedFileStudents,
            batch: selectedFile.batch,
            school: selectedFile.school,
            date_of_immersion: selectedFile.date_of_immersion,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || `HTTP error! status: ${response.status}`
        );
      }

      const data = await response.json();
      console.log("File updated successfully:", data);
      alert("File updated successfully!");

      // Update the original data to reflect the saved changes
      setOriginalFileStudents(JSON.parse(JSON.stringify(selectedFileStudents))); // Deep copy
      setIsEditingHistory(false);

      await fetchGeneratedFiles();
    } catch (error) {
      console.error("Error updating file:", error);
      alert("Failed to update file: " + error.message);
    }
    setIsUpdating(false);
  };

  const deleteFile = async (fileId) => {
    if (!confirm("Are you sure you want to delete this file?")) return;

    try {
      const response = await fetch(
        `${API_BASE}/api/generated-files/${fileId}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      setGeneratedFiles(generatedFiles.filter((f) => f.id !== fileId));

      if (selectedFile && selectedFile.id === fileId) {
        setSelectedFile(null);
        setSelectedFileStudents([]);
        setIsEditingHistory(false);
        setHistoryToppers({});
      }

      alert("File deleted successfully!");
    } catch (error) {
      console.error("Error deleting file:", error);
      alert("Failed to delete file: " + error.message);
    }
  };

  const downloadFile = async (fileId, filename) => {
    setIsDownloading(true);
    try {
      const response = await fetch(
        `${API_BASE}/api/generated-files/${fileId}/download`,
        {
          method: "GET",
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();

      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);

      console.log("Download completed for:", filename);
    } catch (error) {
      console.error("Error downloading file:", error);
      alert("Failed to download file: " + error.message);
    }
    setIsDownloading(false);
  };

  useEffect(() => {
    fetchGeneratedFiles();
  }, []);

  useEffect(() => {
    if (activeTab === "create") {
      setSelectedFile(null);
      setSelectedFileStudents([]);
      setIsEditingHistory(false);
      setShowFilesPopup(false);
      setHistoryToppers({});
    }
  }, [activeTab]);

  return (
    <div className="relative bg-neutral-900 flex min-h-screen text-white overflow-hidden font-arial">
      <div className="fixed inset-0 bg-cover bg-center blur-lg -z-10"></div>
      <div className="absolute inset-0 bg-black/10 -z-10"></div>

      <style>
        {`
          input[type="number"]::-webkit-outer-spin-button,
          input[type="number"]::-webkit-inner-spin-button {
            -webkit-appearance: none;
            margin: 0;
          }
          
          input[type="number"] {
            -moz-appearance: textfield;
          }
          
          .grade-input {
            width: 50px !important;
            min-width: 50px;
            max-width: 50px;
          }
        `}
      </style>

      {/* Files Popup */}
      {showFilesPopup && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center pt-20">
          <div className="bg-zinc-800/95 backdrop-blur-sm p-6 rounded-xl shadow-2xl max-w-6xl w-full mx-4 max-h-[80vh] overflow-hidden">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white">Files</h2>
              <button
                onClick={() => setShowFilesPopup(false)}
                className="text-white hover:text-red-400 text-2xl font-bold p-2"
              >
                ✕
              </button>
            </div>

            <div className="mb-4">
              <button
                onClick={fetchGeneratedFiles}
                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 rounded-lg transition-all duration-300 font-semibold text-white shadow-lg text-sm"
                disabled={loadingFiles}
              >
                {loadingFiles ? "Loading..." : "Refresh Files"}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 max-h-[60vh] overflow-y-auto pr-2">
              {generatedFiles.length === 0 ? (
                <div className="col-span-full text-center text-gray-400 py-12">
                  {loadingFiles ? (
                    <div className="animate-pulse">
                      <div className="text-4xl mb-4">⏳</div>
                      <div className="text-sm">Loading files...</div>
                    </div>
                  ) : (
                    <div>
                      <div className="text-4xl mb-4">📂</div>
                      <div className="text-sm">No files found</div>
                    </div>
                  )}
                </div>
              ) : (
                generatedFiles.map((file) => (
                  <div
                    key={file.id}
                    className={`p-4 rounded-xl border cursor-pointer transition-all duration-300 shadow-md hover:shadow-lg ${
                      selectedFile?.id === file.id
                        ? "bg-gradient-to-r from-purple-600 to-purple-700 border-purple-400 transform scale-[1.02]"
                        : "bg-zinc-600/80 border-zinc-500 hover:bg-zinc-600"
                    }`}
                    onClick={() => {
                      fetchFileDetails(file.id);
                      setActiveTab("history");
                    }}
                  >
                    <div
                      className="font-semibold text-base text-white truncate mb-2"
                      title={file.original_filename || file.batch}
                    >
                      {file.original_filename || file.batch}
                    </div>
                    <div
                      className="text-sm text-gray-300 truncate mb-1"
                      title={file.school}
                    >
                      {file.school}
                    </div>
                    <div className="text-sm text-gray-300 mb-1">
                      {file.student_count || 0} students
                    </div>
                    <div className="text-sm text-gray-300 mb-1">
                      {file.created_at
                        ? new Date(file.created_at).toLocaleDateString()
                        : "N/A"}
                    </div>
                    {file.average_performance && (
                      <div className="text-sm text-green-400 font-semibold">
                        Avg: {parseFloat(file.average_performance).toFixed(1)}%
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      <Dashboard />

      {/* Main Content */}
      <div className="flex-1 p-4 mt-16 mr-8 overflow-y-auto">
        <div className="w-full max-w-[1920px] mx-auto">
          {/* Tab Navigation */}
          <div className="bg-zinc-700/90 backdrop-blur-sm p-6 rounded-xl shadow-2xl mb-8">
            <div className="flex gap-4">
              <button
                onClick={() => setActiveTab("create")}
                className={`px-8 py-4 rounded-xl font-bold text-lg transition-all duration-300 shadow-lg ${
                  activeTab === "create"
                    ? "bg-gradient-to-r from-[#9d4edd] to-[#c77dff] text-white shadow-[0px_0px_20px_rgba(157,78,221,0.6)] transform scale-105"
                    : "bg-gradient-to-r from-[#6a0dad] to-[#8a2be2] text-white hover:from-[#7b1fa2] hover:to-[#9c27b0] hover:scale-105"
                }`}
              >
                Create New Report
              </button>
              <button
                onClick={() => {
                  setActiveTab("history");
                  setShowFilesPopup(true);
                }}
                className={`px-8 py-4 rounded-xl font-bold text-lg transition-all duration-300 shadow-lg relative ${
                  activeTab === "history"
                    ? "bg-gradient-to-r from-[#9d4edd] to-[#c77dff] text-white shadow-[0px_0px_20px_rgba(157,78,221,0.6)] transform scale-105"
                    : "bg-gradient-to-r from-[#6a0dad] to-[#8a2be2] text-white hover:from-[#7b1fa2] hover:to-[#9c27b0] hover:scale-105"
                }`}
              >
                Immersion Records
                {generatedFiles.length > 0 && (
                  <span className="absolute -top-2 -right-2 bg-gradient-to-r from-yellow-500 to-amber-500 text-black text-sm font-bold px-3 py-1 rounded-full min-w-[28px] flex items-center justify-center shadow-lg">
                    {generatedFiles.length}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Create Tab Content */}
          {activeTab === "create" && (
            <>
              {/* File Upload Section */}
              <div className="bg-zinc-700/90 backdrop-blur-sm p-8 rounded-xl shadow-2xl mb-8">
                <h2 className="text-2xl font-bold mb-6 text-white">
                  Upload Trainee Excel File & Generate Report
                </h2>

                {!file ? (
                  <div className="flex flex-col gap-4">
                    <input
                      type="file"
                      onChange={(e) => {
                        setFile(e.target.files[0]);
                        setFileName(e.target.files[0]?.name || "");
                      }}
                      className="bg-zinc-600/80 text-white p-4 rounded-xl file:bg-gradient-to-r file:from-violet-600 file:to-purple-600 file:text-white file:border-0 file:rounded-lg file:px-4 file:py-2 file:mr-4 file:font-semibold file:cursor-pointer file:hover:from-violet-700 file:hover:to-purple-700 file:transition-all"
                      accept=".xlsx,.xls"
                    />
                  </div>
                ) : (
                  <div className="bg-zinc-600/80 p-6 rounded-xl">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <span className="text-2xl">📄</span>
                        <div>
                          <p className="text-white font-semibold text-lg">
                            {fileName}
                          </p>
                          <p className="text-gray-300 text-sm">
                            {students.length > 0
                              ? `${students.length} students loaded`
                              : "Ready to upload"}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        {students.length === 0 && (
                          <button
                            className="rounded-xl bg-gradient-to-r from-[#a361ef] to-[#c77dff] px-6 py-3 text-white font-bold hover:from-[#9551df] hover:to-[#b666f0] transition-all duration-300 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                            onClick={handleUpload}
                            disabled={isUploading}
                          >
                            {isUploading
                              ? "Processing..."
                              : "Process & Generate"}
                          </button>
                        )}
                        <button
                          className="rounded-xl bg-gradient-to-r from-red-600 to-red-700 px-6 py-3 text-white font-bold hover:from-red-700 hover:to-red-800 transition-all duration-300 shadow-lg"
                          onClick={handleRemoveFile}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* CHANGED: Top Performers Section by Department - Create Tab */}
              {Object.keys(toppers).some((dept) => toppers[dept]) && (
                <div className="bg-gradient-to-r from-zinc-700/90 to-zinc-600/90 backdrop-blur-sm p-8 rounded-xl shadow-2xl mb-8">
                  <h2 className="text-2xl font-bold mb-6 text-white">
                    Top Performers by Department
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {departments.map((dept) => {
                      const topper = toppers[dept];
                      if (!topper) return null;

                      return (
                        <div
                          key={dept}
                          className="bg-gradient-to-br from-zinc-800/80 to-zinc-900/80 p-6 rounded-xl border border-[#9d4edd] shadow-2xl"
                        >
                          <div className="text-center mb-4">
                            <div className="text-4xl mb-2">🏆</div>
                            <h3 className="text-lg font-bold text-yellow-400 mb-2">
                              {dept} DEPARTMENT
                            </h3>
                          </div>
                          <div className="text-center">
                            <div className="font-bold text-xl text-white mb-2">
                              {topper.last_name}, {topper.first_name}{" "}
                              {topper.middle_name || ""}
                            </div>
                            <div className="text-lg text-white mb-2">
                              <span className="text-yellow-300 font-semibold">
                                Score:
                              </span>
                              <span className="text-green-400 font-bold ml-2 text-xl">
                                {topper.over_all || "N/A"}
                              </span>
                            </div>
                            <div className="text-sm text-purple-300">
                              <span className="font-semibold">Strand:</span>
                              <span className="text-white ml-1">
                                {topper.strand}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Department Selection and Grades Table for Create Tab */}
              {students.length > 0 && (
                <>
                  <div className="bg-zinc-700/90 backdrop-blur-sm p-6 rounded-xl shadow-2xl mb-8">
                    <h3 className="text-xl font-bold text-white mb-4">
                      Select Department
                    </h3>
                    <div className="flex gap-4">
                      {departments.map((dept) => (
                        <button
                          key={dept}
                          onClick={() => setActiveDept(dept)}
                          className={`px-6 py-3 rounded-xl font-bold text-lg transition-all duration-300 shadow-lg ${
                            activeDept === dept
                              ? "bg-gradient-to-r from-[#9d4edd] to-[#c77dff] text-white shadow-[0px_0px_15px_rgba(157,78,221,0.6)] transform scale-105"
                              : "bg-gradient-to-r from-[#6a0dad] to-[#8a2be2] text-white hover:from-[#7b1fa2] hover:to-[#9c27b0] hover:scale-105"
                          }`}
                        >
                          {dept}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Grades Table for Create Tab */}
                  {filteredStudents.length > 0 && (
                    <div className="bg-zinc-700/90 backdrop-blur-sm p-8 rounded-xl shadow-2xl mb-8">
                      <h2 className="text-2xl font-bold mb-6 text-white">
                        {activeDept} Department Grades
                      </h2>
                      <div className="overflow-x-auto rounded-xl">
                        <table className="w-full border-collapse text-sm bg-zinc-800/50 rounded-xl overflow-hidden">
                          <thead>
                            <tr>
                              <th
                                className="border border-zinc-600 p-3 text-center bg-gradient-to-r from-[#6a0dad] to-[#8a2be2] text-white font-bold"
                                rowSpan="2"
                              >
                                Name
                              </th>
                              <th
                                className="border border-zinc-600 p-3 text-center bg-gradient-to-r from-[#6a0dad] to-[#8a2be2] text-white font-bold"
                                rowSpan="2"
                              >
                                Strand
                              </th>
                              <th
                                className="border border-zinc-600 p-3 text-center bg-gradient-to-r from-[#6a0dad] to-[#8a2be2] text-white font-bold"
                                rowSpan="2"
                              >
                                Department
                              </th>
                              <th
                                className="border border-zinc-600 p-3 text-center bg-gradient-to-r from-[#6a0dad] to-[#8a2be2] text-white font-bold"
                                rowSpan="2"
                              >
                                Performance
                              </th>
                              {gradingStructures[activeDept].groups.map(
                                (group, idx) => (
                                  <th
                                    key={idx}
                                    className="border border-zinc-600 p-3 text-center bg-gradient-to-r from-[#6a0dad] to-[#8a2be2] text-white font-bold"
                                    colSpan={group.fields.length}
                                  >
                                    {group.label}
                                  </th>
                                )
                              )}
                            </tr>
                            <tr>
                              {gradingStructures[activeDept].groups.flatMap(
                                (group) =>
                                  group.fields.map((field) => (
                                    <th
                                      key={field}
                                      className="border border-zinc-600 p-3 text-center bg-gradient-to-r from-[#6a0dad] to-[#8a2be2] text-white font-bold"
                                    >
                                      {field}
                                    </th>
                                  ))
                              )}
                            </tr>
                          </thead>
                          <tbody>
                            {filteredStudents.map((s, i) => {
                              const studentIndex = students.indexOf(s);
                              return (
                                <tr
                                  key={i}
                                  className="text-center hover:bg-zinc-600/30 transition-colors"
                                >
                                  <td className="border border-zinc-600 p-3 text-white bg-zinc-800/80 font-medium">
                                    {s.last_name}, {s.first_name}{" "}
                                    {s.middle_name}
                                  </td>
                                  <td className="border border-zinc-600 p-3 text-white bg-zinc-800/80">
                                    {s.strand}
                                  </td>
                                  <td className="border border-zinc-600 p-3 text-white bg-zinc-800/80">
                                    {s.department}
                                  </td>
                                  <td className="border border-zinc-600 p-3 bg-zinc-800/80">
                                    <input
                                      type="number"
                                      value={s.over_all || ""}
                                      onChange={(e) =>
                                        handleGradeChange(
                                          studentIndex,
                                          "over_all",
                                          e.target.value
                                        )
                                      }
                                      className="grade-input p-2 bg-zinc-700 border border-zinc-500 rounded-lg text-white text-center focus:border-[#6a0dad] focus:outline-none focus:ring-2 focus:ring-[#6a0dad]/20"
                                      min="0"
                                      max="100"
                                      step="0.1"
                                      placeholder="0"
                                    />
                                  </td>
                                  {gradingStructures[activeDept].groups.flatMap(
                                    (group) =>
                                      group.fields.map((field) => {
                                        const limits = getFieldLimits(field);
                                        return (
                                          <td
                                            key={field}
                                            className="border border-zinc-600 p-3 bg-zinc-800/80"
                                          >
                                            <input
                                              type="number"
                                              value={s[field] || ""}
                                              onChange={(e) =>
                                                handleGradeChange(
                                                  studentIndex,
                                                  field,
                                                  e.target.value
                                                )
                                              }
                                              className="grade-input p-2 bg-zinc-700 border border-zinc-500 rounded-lg text-white text-center focus:border-[#6a0dad] focus:outline-none focus:ring-2 focus:ring-[#6a0dad]/20"
                                              min={limits.min}
                                              max={limits.max}
                                              step={limits.step}
                                              placeholder="0"
                                            />
                                          </td>
                                        );
                                      })
                                  )}
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {/* History Tab */}
          {activeTab === "history" && (
            <div className="w-full">
              {!selectedFile ? (
                <div className="flex items-center justify-center h-[600px] bg-zinc-700/90 backdrop-blur-sm rounded-xl shadow-2xl">
                  <div className="text-center">
                    <div className="text-8xl mb-6">📁</div>
                    <h2 className="text-3xl font-bold mb-4 text-white">
                      Select a File
                    </h2>
                    <p className="text-xl text-gray-300 mb-6">
                      Click "Generated Files History" to choose a file to view
                      and edit
                    </p>
                    <button
                      onClick={() => setShowFilesPopup(true)}
                      className="px-8 py-4 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 rounded-xl transition-all duration-300 font-bold text-white shadow-lg"
                    >
                      Open Files List
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* File Header */}
                  <div className="bg-zinc-700/90 backdrop-blur-sm p-6 rounded-xl shadow-2xl mb-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1 min-w-0">
                        <h2
                          className="text-2xl font-bold text-white mb-3 truncate"
                          title={
                            selectedFile.original_filename ||
                            selectedFile.filename
                          }
                        >
                          {selectedFile.original_filename ||
                            selectedFile.filename}
                        </h2>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-sm text-gray-300">
                          <div className="flex items-center gap-2">
                            <span>🏫</span>
                            <span
                              className="truncate"
                              title={selectedFile.school}
                            >
                              {selectedFile.school}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span>👥</span>
                            <span>{selectedFile.batch}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span>📅</span>
                            <span>
                              {selectedFile.date_of_immersion
                                ? new Date(
                                    selectedFile.date_of_immersion
                                  ).toLocaleDateString()
                                : "N/A"}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span>🎓</span>
                            <span>{selectedFileStudents.length} students</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 ml-4">
                        <button
                          onClick={() => setShowFilesPopup(true)}
                          className="px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 rounded-lg transition-all duration-300 font-semibold text-white shadow-lg text-sm"
                        >
                          Change File
                        </button>
                        {!isEditingHistory ? (
                          <>
                            <button
                              onClick={() => setIsEditingHistory(true)}
                              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 rounded-lg transition-all duration-300 font-semibold text-white shadow-lg text-sm"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() =>
                                downloadFile(
                                  selectedFile.id,
                                  selectedFile.original_filename ||
                                    selectedFile.filename
                                )
                              }
                              disabled={isDownloading}
                              className="px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 rounded-lg transition-all duration-300 font-semibold text-white shadow-lg disabled:opacity-50 text-sm"
                            >
                              {isDownloading ? "⏳..." : "Download"}
                            </button>
                            <button
                              onClick={() => deleteFile(selectedFile.id)}
                              className="px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 rounded-lg transition-all duration-300 font-semibold text-white shadow-lg text-sm"
                            >
                              Delete
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={updateFile}
                              disabled={isUpdating}
                              className="px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 rounded-lg transition-all duration-300 font-semibold text-white shadow-lg disabled:opacity-50 text-sm"
                            >
                              {isUpdating ? "Saving..." : "Save Changes"}
                            </button>
                            <button
                              onClick={() => {
                                setIsEditingHistory(false);
                                // Restore original data instead of refetching
                                setSelectedFileStudents(
                                  JSON.parse(
                                    JSON.stringify(originalFileStudents)
                                  )
                                ); // Deep copy
                                const restoredToppers =
                                  calculateTopPerformers(originalFileStudents);
                                setHistoryToppers(restoredToppers);
                              }}
                              className="px-4 py-2 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 rounded-lg transition-all duration-300 font-semibold text-white shadow-lg text-sm"
                            >
                              Cancel
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Top Performers Section by Department for History */}
                  {Object.keys(historyToppers).some(
                    (dept) => historyToppers[dept]
                  ) && (
                    <div className="bg-gradient-to-r from-zinc-700/90 to-zinc-600/90 backdrop-blur-sm p-8 rounded-xl shadow-2xl mb-8">
                      <h2 className="text-2xl font-bold mb-6 text-white">
                        Top Performers by Department
                      </h2>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {departments.map((dept) => {
                          const topper = historyToppers[dept];
                          if (!topper) return null;

                          return (
                            <div
                              key={dept}
                              className="bg-gradient-to-br from-zinc-800/80 to-zinc-900/80 p-6 rounded-xl border border-[#9d4edd] shadow-2xl"
                            >
                              <div className="text-center mb-4">
                                <div className="text-4xl mb-2">🏆</div>
                                <h3 className="text-lg font-bold text-yellow-400 mb-2">
                                  {dept} DEPARTMENT
                                </h3>
                              </div>
                              <div className="text-center">
                                <div className="font-bold text-xl text-white mb-2">
                                  {topper.last_name}, {topper.first_name}{" "}
                                  {topper.middle_name || ""}
                                </div>
                                <div className="text-lg text-white mb-2">
                                  <span className="text-yellow-300 font-semibold">
                                    Score:
                                  </span>
                                  <span className="text-green-400 font-bold ml-2 text-xl">
                                    {topper.over_all || "N/A"}
                                  </span>
                                </div>
                                <div className="text-sm text-purple-300">
                                  <span className="font-semibold">Strand:</span>
                                  <span className="text-white ml-1">
                                    {topper.strand}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Department Tabs for History */}
                  {isEditingHistory && (
                    <div className="bg-zinc-700/90 backdrop-blur-sm p-6 rounded-xl shadow-2xl mb-6">
                      <h3 className="text-lg font-bold text-white mb-4">
                        Select Department to Edit
                      </h3>
                      <div className="flex flex-wrap gap-3">
                        {departments.map((dept) => {
                          const deptStudentCount = selectedFileStudents.filter(
                            (s) => {
                              const studentDept =
                                s.department?.trim().toUpperCase() || "";
                              if (dept === "TECHNICAL") {
                                return (
                                  studentDept === "TECHNICAL" ||
                                  studentDept === "IT"
                                );
                              }
                              if (dept === "PRODUCTION") {
                                return (
                                  studentDept === "PRODUCTION" ||
                                  studentDept === "PROD"
                                );
                              }
                              if (dept === "SUPPORT") {
                                return (
                                  studentDept !== "TECHNICAL" &&
                                  studentDept !== "IT" &&
                                  studentDept !== "PRODUCTION" &&
                                  studentDept !== "PROD"
                                );
                              }
                              return false;
                            }
                          ).length;

                          return (
                            <button
                              key={dept}
                              onClick={() => setHistoryActiveDept(dept)}
                              className={`px-5 py-3 rounded-xl font-semibold text-base transition-all duration-300 shadow-lg ${
                                historyActiveDept === dept
                                  ? "bg-gradient-to-r from-[#9d4edd] to-[#c77dff] text-white shadow-[0px_0px_15px_rgba(157,78,221,0.6)] transform scale-105"
                                  : "bg-gradient-to-r from-[#6a0dad] to-[#8a2be2] text-white hover:from-[#7b1fa2] hover:to-[#9c27b0] hover:scale-105"
                              }`}
                            >
                              {dept} ({deptStudentCount})
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* History Students Content */}
                  {isEditingHistory ? (
                    <div className="bg-zinc-700/90 backdrop-blur-sm p-6 rounded-xl shadow-2xl">
                      <h3 className="text-xl font-bold mb-4 text-white">
                        {historyActiveDept} Department Grades (Edit Mode) -{" "}
                        {filteredHistoryStudents.length} students
                      </h3>

                      {filteredHistoryStudents.length === 0 ? (
                        <div className="text-center text-gray-400 py-12">
                          <div className="text-6xl mb-4">👥</div>
                          <div className="text-lg">
                            No students found in {historyActiveDept} department
                          </div>
                        </div>
                      ) : (
                        <div className="overflow-x-auto rounded-xl">
                          <table className="w-full border-collapse text-sm bg-zinc-800/50 rounded-xl overflow-hidden">
                            <thead>
                              <tr>
                                <th
                                  className="border border-zinc-600 p-3 bg-gradient-to-r from-[#6a0dad] to-[#8a2be2] text-white font-bold"
                                  rowSpan="2"
                                >
                                  Name
                                </th>
                                <th
                                  className="border border-zinc-600 p-3 bg-gradient-to-r from-[#6a0dad] to-[#8a2be2] text-white font-bold"
                                  rowSpan="2"
                                >
                                  Strand
                                </th>
                                <th
                                  className="border border-zinc-600 p-3 bg-gradient-to-r from-[#6a0dad] to-[#8a2be2] text-white font-bold"
                                  rowSpan="2"
                                >
                                  Department
                                </th>
                                <th
                                  className="border border-zinc-600 p-3 bg-gradient-to-r from-[#6a0dad] to-[#8a2be2] text-white font-bold"
                                  rowSpan="2"
                                >
                                  Performance
                                </th>
                                {gradingStructures[
                                  historyActiveDept
                                ].groups.map((group, idx) => (
                                  <th
                                    key={idx}
                                    className="border border-zinc-600 p-3 bg-gradient-to-r from-[#6a0dad] to-[#8a2be2] text-white font-bold"
                                    colSpan={group.fields.length}
                                  >
                                    {group.label}
                                  </th>
                                ))}
                              </tr>
                              <tr>
                                {gradingStructures[
                                  historyActiveDept
                                ].groups.flatMap((group) =>
                                  group.fields.map((field) => (
                                    <th
                                      key={field}
                                      className="border border-zinc-600 p-3 bg-gradient-to-r from-[#6a0dad] to-[#8a2be2] text-white font-bold"
                                    >
                                      {field}
                                    </th>
                                  ))
                                )}
                              </tr>
                            </thead>
                            <tbody>
                              {filteredHistoryStudents.map((student, index) => {
                                const studentIndex =
                                  selectedFileStudents.findIndex(
                                    (s) => s.id === student.id
                                  );
                                return (
                                  <tr
                                    key={student.id || index}
                                    className="hover:bg-zinc-600/30 transition-colors"
                                  >
                                    <td className="border border-zinc-600 p-3 text-white bg-zinc-800/80 font-medium">
                                      {student.last_name}, {student.first_name}{" "}
                                      {student.middle_name}
                                    </td>
                                    <td className="border border-zinc-600 p-3 text-white bg-zinc-800/80">
                                      {student.strand}
                                    </td>
                                    <td className="border border-zinc-600 p-3 text-white bg-zinc-800/80">
                                      {student.department}
                                    </td>
                                    <td className="border border-zinc-600 p-3 bg-zinc-800/80">
                                      <input
                                        type="number"
                                        value={student.over_all || ""}
                                        onChange={(e) =>
                                          handleHistoryGradeChange(
                                            studentIndex,
                                            "over_all",
                                            e.target.value
                                          )
                                        }
                                        className="grade-input p-2 bg-zinc-700 border border-zinc-500 rounded-lg text-white text-center focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                                        min="0"
                                        max="100"
                                        step="0.1"
                                        placeholder="0"
                                      />
                                    </td>
                                    {gradingStructures[
                                      historyActiveDept
                                    ].groups.flatMap((group) =>
                                      group.fields.map((field) => {
                                        const limits = getFieldLimits(field);
                                        return (
                                          <td
                                            key={field}
                                            className="border border-zinc-600 p-3 bg-zinc-800/80"
                                          >
                                            <input
                                              type="number"
                                              value={student[field] || ""}
                                              onChange={(e) =>
                                                handleHistoryGradeChange(
                                                  studentIndex,
                                                  field,
                                                  e.target.value
                                                )
                                              }
                                              className="grade-input p-2 bg-zinc-700 border border-zinc-500 rounded-lg text-white text-center focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                                              min={limits.min}
                                              max={limits.max}
                                              step={limits.step}
                                              placeholder="0"
                                            />
                                          </td>
                                        );
                                      })
                                    )}
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-zinc-700/90 backdrop-blur-sm p-6 rounded-xl shadow-2xl">
                      <h3 className="text-xl font-bold mb-4 text-white">
                        Students Overview - {selectedFileStudents.length} total
                        students
                      </h3>

                      {selectedFileStudents.length === 0 ? (
                        <div className="text-center text-gray-400 py-12">
                          <div className="text-6xl mb-4">📊</div>
                          <div className="text-lg">
                            No student data available
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                          {selectedFileStudents.map((student, index) => (
                            <div
                              key={student.id || index}
                              className="bg-zinc-600/80 p-5 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border border-zinc-500 hover:border-zinc-400"
                            >
                              <div
                                className="font-semibold text-lg text-white mb-3 truncate"
                                title={`${student.last_name}, ${student.first_name}`}
                              >
                                {student.last_name}, {student.first_name}
                              </div>
                              <div className="text-white space-y-2 text-sm">
                                <div className="flex items-center gap-2">
                                  <span>📚</span>
                                  <span className="truncate">
                                    {student.strand}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span>🏢</span>
                                  <span className="truncate">
                                    {student.department}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span>📊</span>
                                  <span>Performance:</span>
                                  <span className="font-bold text-green-400 text-base">
                                    {student.over_all || "N/A"}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default GradePreview;
