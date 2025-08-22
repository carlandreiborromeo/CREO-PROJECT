import React, { useState, useEffect } from "react";

function GeneratedFiles() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState(null);
  const [students, setStudents] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [activeDept, setActiveDept] = useState("TECHNICAL");
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const API_BASE = "http://localhost:5000"; // Adjust if your backend runs on different port

  const departments = ["TECHNICAL", "PRODUCTION", "SUPPORT"];

  // Grading structures (same as in GradePreview)
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

  // Real API functions
  const fetchFiles = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/generated-files`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setFiles(data.files || []);
    } catch (error) {
      console.error("Error fetching files:", error);
      alert("Failed to fetch files: " + error.message);
    }
    setLoading(false);
  };

  const fetchFileDetails = async (fileId) => {
    try {
      const response = await fetch(`${API_BASE}/api/generated-files/${fileId}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();

      setStudents(data.students || []);
      setSelectedFile(data.file);
    } catch (error) {
      console.error("Error fetching file details:", error);
      alert("Failed to fetch file details: " + error.message);
    }
  };

  const updateFile = async () => {
    if (!selectedFile) return;

    setIsUpdating(true);
    try {
      const response = await fetch(
        `${API_BASE}/api/generated-files/${selectedFile.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            students: students,
            batch: selectedFile.batch,
            school: selectedFile.school,
            date_of_immersion: selectedFile.date_of_immersion,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("File updated successfully:", data);
      alert("File updated successfully!");
      setIsEditing(false);

      // Refresh the files list to show updated info
      fetchFiles();
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

      // Remove from local state
      setFiles(files.filter((f) => f.id !== fileId));

      // Clear selection if deleted file was selected
      if (selectedFile && selectedFile.id === fileId) {
        setSelectedFile(null);
        setStudents([]);
        setIsEditing(false);
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

      // Get the blob from response
      const blob = await response.blob();

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();

      // Cleanup
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);

      console.log("Download completed for:", filename);
    } catch (error) {
      console.error("Error downloading file:", error);
      alert("Failed to download file: " + error.message);
    }
    setIsDownloading(false);
  };

  const handleGradeChange = (index, field, value) => {
    const updated = [...students];
    // Convert empty string to null for database consistency
    updated[index][field] = value === "" ? null : value;
    setStudents(updated);
  };

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

  useEffect(() => {
    fetchFiles();
  }, []);

  return (
    <div className="relative bg-neutral-900 flex min-h-screen text-white overflow-hidden font-arial">
      {/* Background */}
      <div className="fixed inset-0 bg-cover bg-center blur-lg -z-10"></div>
      <div className="absolute inset-0 bg-black/10 -z-10"></div>

      {/* Add custom styles to hide number input arrows */}
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
        `}
      </style>

      {/* Sidebar */}
      <div className="w-64 bg-zinc-800 p-4 border-r border-zinc-700">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-purple-400">
            Generated Files
          </h1>
          <p className="text-gray-400 text-sm">Manage your Excel reports</p>
        </div>

        <button
          onClick={fetchFiles}
          className="w-full mb-4 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
          disabled={loading}
        >
          {loading ? "Loading..." : "Refresh Files"}
        </button>

        {/* File List */}
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {files.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              {loading ? "Loading files..." : "No files found"}
            </div>
          ) : (
            files.map((file) => (
              <div
                key={file.id}
                className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedFile?.id === file.id
                    ? "bg-purple-600 border-purple-500"
                    : "bg-zinc-700 border-zinc-600 hover:bg-zinc-600"
                }`}
                onClick={() => {
                  fetchFileDetails(file.id);
                  setIsEditing(false);
                }}
              >
                <div className="font-semibold text-sm truncate">
                  {file.batch}
                </div>
                <div className="text-xs text-gray-400 truncate">
                  {file.school}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {file.student_count || 0} students
                </div>
                <div className="text-xs text-gray-500">
                  {file.created_at
                    ? new Date(file.created_at).toLocaleDateString()
                    : "N/A"}
                </div>
                {file.average_performance && (
                  <div className="text-xs text-green-400">
                    Avg: {parseFloat(file.average_performance).toFixed(1)}%
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6 overflow-y-auto">
        {!selectedFile ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="text-6xl mb-4">📁</div>
              <h2 className="text-2xl font-bold mb-2">Select a File</h2>
              <p className="text-gray-400">
                Choose a file from the sidebar to view and edit
              </p>
            </div>
          </div>
        ) : (
          <div className="max-w-7xl mx-auto">
            {/* File Header */}
            <div className="bg-zinc-800 p-6 rounded-lg mb-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-bold">
                    {selectedFile.filename}
                  </h2>
                  <div className="flex items-center gap-4 text-sm text-gray-400 mt-2">
                    <span>📚 {selectedFile.school}</span>
                    <span>👥 {selectedFile.batch}</span>
                    <span>
                      📅{" "}
                      {selectedFile.date_of_immersion
                        ? new Date(
                            selectedFile.date_of_immersion
                          ).toLocaleDateString()
                        : "N/A"}
                    </span>
                    <span>🎓 {students.length} students</span>
                    {selectedFile.file_size && (
                      <span>
                        💾 {Math.round(selectedFile.file_size / 1024)} KB
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  {!isEditing ? (
                    <>
                      <button
                        onClick={() => setIsEditing(true)}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() =>
                          downloadFile(selectedFile.id, selectedFile.filename)
                        }
                        disabled={isDownloading}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors disabled:opacity-50"
                      >
                        {isDownloading ? "Downloading..." : "Download"}
                      </button>
                      <button
                        onClick={() => deleteFile(selectedFile.id)}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                      >
                        Delete
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={updateFile}
                        disabled={isUpdating}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors disabled:opacity-50"
                      >
                        {isUpdating ? "Saving..." : "Save Changes"}
                      </button>
                      <button
                        onClick={() => {
                          setIsEditing(false);
                          fetchFileDetails(selectedFile.id); // Reset changes
                        }}
                        className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg transition-colors"
                      >
                        Cancel
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Department Tabs */}
            {isEditing && (
              <div className="flex gap-2 mb-6">
                {departments.map((dept) => {
                  const deptStudentCount = students.filter((s) => {
                    const studentDept =
                      s.department?.trim().toUpperCase() || "";
                    if (dept === "TECHNICAL") {
                      return (
                        studentDept === "TECHNICAL" || studentDept === "IT"
                      );
                    }
                    if (dept === "PRODUCTION") {
                      return (
                        studentDept === "PRODUCTION" || studentDept === "PROD"
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
                  }).length;

                  return (
                    <button
                      key={dept}
                      onClick={() => setActiveDept(dept)}
                      className={`px-4 py-2 rounded-lg font-bold transition-all duration-300 ${
                        activeDept === dept
                          ? "bg-[#9d4edd] text-white shadow-[0px_0px_10px_rgba(157,78,221,0.6)]"
                          : "bg-[#6a0dad] text-white hover:bg-[#8a2be2]"
                      }`}
                    >
                      {dept} ({deptStudentCount})
                    </button>
                  );
                })}
              </div>
            )}

            {/* Students Table */}
            {isEditing ? (
              <div className="bg-zinc-800 p-6 rounded-lg">
                <h3 className="text-xl font-bold mb-4">
                  {activeDept} Department Grades (Edit Mode) -{" "}
                  {filteredStudents.length} students
                </h3>

                {filteredStudents.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    No students found in {activeDept} department
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-sm">
                      <thead>
                        <tr>
                          <th
                            className="border border-zinc-600 p-2 bg-zinc-700"
                            rowSpan="2"
                          >
                            Name
                          </th>
                          <th
                            className="border border-zinc-600 p-2 bg-zinc-700"
                            rowSpan="2"
                          >
                            Strand
                          </th>
                          <th
                            className="border border-zinc-600 p-2 bg-zinc-700"
                            rowSpan="2"
                          >
                            Department
                          </th>
                          <th
                            className="border border-zinc-600 p-2 bg-zinc-700"
                            rowSpan="2"
                          >
                            Performance
                          </th>
                          {gradingStructures[activeDept].groups.map(
                            (group, idx) => (
                              <th
                                key={idx}
                                className="border border-zinc-600 p-2 bg-zinc-700"
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
                                  className="border border-zinc-600 p-2 bg-zinc-700"
                                >
                                  {field}
                                </th>
                              ))
                          )}
                        </tr>
                      </thead>

                      <tbody>
                        {filteredStudents.map((student, index) => (
                          <tr
                            key={student.id || index}
                            className="hover:bg-zinc-700/50"
                          >
                            <td className="border border-zinc-600 p-2">
                              {student.last_name}, {student.first_name}{" "}
                              {student.middle_name}
                            </td>
                            <td className="border border-zinc-600 p-2">
                              {student.strand}
                            </td>
                            <td className="border border-zinc-600 p-2">
                              {student.department}
                            </td>
                            <td className="border border-zinc-600 p-2">
                              <input
                                type="number"
                                value={student.over_all || ""}
                                onChange={(e) =>
                                  handleGradeChange(
                                    students.indexOf(student),
                                    "over_all",
                                    e.target.value
                                  )
                                }
                                className="w-full p-1 bg-zinc-600 border border-zinc-500 rounded text-center focus:border-purple-500 focus:outline-none"
                                min="0"
                                max="100"
                                step="0.1"
                              />
                            </td>

                            {gradingStructures[activeDept].groups.flatMap(
                              (group) =>
                                group.fields.map((field) => (
                                  <td
                                    key={field}
                                    className="border border-zinc-600 p-2"
                                  >
                                    <input
                                      type="number"
                                      value={student[field] || ""}
                                      onChange={(e) =>
                                        handleGradeChange(
                                          students.indexOf(student),
                                          field,
                                          e.target.value
                                        )
                                      }
                                      className="w-full p-1 bg-zinc-600 border border-zinc-500 rounded text-center focus:border-purple-500 focus:outline-none"
                                      min="0"
                                      max="100"
                                      step="0.1"
                                    />
                                  </td>
                                ))
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-zinc-800 p-6 rounded-lg">
                <h3 className="text-xl font-bold mb-4">Students Overview</h3>

                {students.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    No student data available
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {students.map((student, index) => (
                      <div
                        key={student.id || index}
                        className="bg-zinc-700 p-4 rounded-lg"
                      >
                        <div className="font-semibold text-lg mb-2">
                          {student.last_name}, {student.first_name}
                        </div>
                        <div className="text-sm text-gray-400 space-y-1">
                          <div>📚 {student.strand}</div>
                          <div>🏢 {student.department}</div>
                          <div className="flex items-center gap-2">
                            <span>📊 Performance:</span>
                            <span className="font-bold text-green-400">
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
          </div>
        )}
      </div>
    </div>
  );
}

export default GeneratedFiles;
