import { useEffect, useMemo, useRef, useState } from "react";
import {
  FiEdit2,
  FiEye,
  FiPlus,
  FiSearch,
  FiFilter,
  FiTrash2,
  FiX,
  FiUsers,
  FiBookOpen,
  FiPhone,
  FiMail,
  FiUser,
  FiMapPin,
  FiCreditCard,
  FiSettings,
  FiSave,
  FiUploadCloud,
  FiDownload,
  FiCheckCircle,
  FiAlertTriangle,
  FiXCircle,
  FiFileText,
} from "react-icons/fi";
import { FaGraduationCap } from "react-icons/fa";
import toast from "react-hot-toast";

import api from "../services/axios";
import { usePermissions } from "../hooks/usePermissions";
import "../styles/students.css";
import logo from "../assets/sk-logo.png";

const initialForm = {
  studentName: "",
  rollNo: "",
  parentName: "",
  phone: "",
  alternatePhone: "",
  email: "",
  course: "",
  idproof: "",
  batch: "",
  schoolName: "",
  address: "",
};

const Students = () => {
  const { hasPermission, hasGlobalPermission } =
    usePermissions();

  const canAddStudent = hasPermission(
    "students",
    "actions",
    "add"
  );

  const canEditStudent = hasPermission(
    "students",
    "actions",
    "edit"
  );

  const canDeleteStudent = hasPermission(
    "students",
    "actions",
    "delete"
  );

  // Global — controls fee visibility everywhere in the app, not just the
  // Students page (reused as-is once the Payment page reads it too).
  const canViewFees = hasGlobalPermission("fees");

  const canViewNameColumn = hasPermission(
    "students",
    "columns",
    "name"
  );

  const canViewRollNoColumn = hasPermission(
    "students",
    "columns",
    "rollNo"
  );

  const canViewCourseColumn = hasPermission(
    "students",
    "columns",
    "course"
  );

  const canViewPhoneColumn = hasPermission(
    "students",
    "columns",
    "phone"
  );

  const canViewAddressDetail = hasPermission(
    "students",
    "sections",
    "address"
  );

  const canViewPhoneNumberDetail = hasPermission(
    "students",
    "sections",
    "phoneNumber"
  );

  const canViewAadharDetail = hasPermission(
    "students",
    "sections",
    "aadhar"
  );

  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState("");
  const [courseFilter, setCourseFilter] =
    useState("all");
  const [batchFilter, setBatchFilter] =
    useState("all");
  const [showFilters, setShowFilters] =
    useState(false);

  const [isLoading, setIsLoading] =
    useState(true);
  const [isSaving, setIsSaving] =
    useState(false);

  const [showFormModal, setShowFormModal] =
    useState(false);

  const [showViewModal, setShowViewModal] =
    useState(false);

  const [
    showDeleteModal,
    setShowDeleteModal,
  ] = useState(false);

  const [editingStudent, setEditingStudent] =
    useState(null);

  const [
    selectedStudent,
    setSelectedStudent,
  ] = useState(null);

  const [formData, setFormData] =
    useState(initialForm);

  const [formErrors, setFormErrors] =
    useState({});

  const [submitError, setSubmitError] =
    useState("");

  const [academicCourses, setAcademicCourses] = useState([]);
  const [academicBatches, setAcademicBatches] = useState([]);
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [newCourseName, setNewCourseName] = useState("");
  const [newBatch, setNewBatch] = useState({
    batchName: "",
    startTime: "",
    endTime: "",
  });
  const [isSetupSaving, setIsSetupSaving] = useState(false);

  const [showBulkUploadModal, setShowBulkUploadModal] =
    useState(false);
  const [bulkStage, setBulkStage] = useState("select");
  const [bulkFile, setBulkFile] = useState(null);
  const [isValidatingBulk, setIsValidatingBulk] =
    useState(false);
  const [bulkPreview, setBulkPreview] = useState(null);
  const [isImportingBulk, setIsImportingBulk] =
    useState(false);
  const [bulkImportResult, setBulkImportResult] =
    useState(null);
  const bulkFileInputRef = useRef(null);

  const fetchStudents = async () => {
    try {
      setIsLoading(true);

      const response =
        await api.get("/students");

      setStudents(response.data || []);
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          "Failed to load students"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAcademicSetup = async () => {
    try {
      const [courseResponse, batchResponse] = await Promise.all([
        api.get("/academic/courses"),
        api.get("/academic/batches"),
      ]);

      setAcademicCourses(courseResponse.data || []);
      setAcademicBatches(batchResponse.data || []);
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          "Failed to load courses and batches"
      );
    }
  };

  useEffect(() => {
    fetchStudents();
    fetchAcademicSetup();
  }, []);

  const studentCourses = useMemo(() => {
    const courseList = students
      .map((student) => student.course)
      .filter(Boolean);

    return [...new Set(courseList)];
  }, [students]);

  const activeFilterCount = [
    courseFilter !== "all",
    batchFilter !== "all",
  ].filter(Boolean).length;

  const filteredStudents = useMemo(() => {
    const keyword =
      search.trim().toLowerCase();

    return students
      .filter((student) => {
        const matchesSearch =
          !keyword ||
          student.studentName
            ?.toLowerCase()
            .includes(keyword) ||
          student.phone?.replace(/\s/g, "").includes(
            search.replace(/\s/g, "")
          );

        const matchesCourse =
          courseFilter === "all" ||
          student.course === courseFilter;

        const matchesBatch =
          batchFilter === "all" ||
          student.batch === batchFilter;

        return (
          matchesSearch &&
          matchesCourse &&
          matchesBatch
        );
      })
      .sort((firstStudent, secondStudent) =>
        String(firstStudent.rollNo || "").localeCompare(
          String(secondStudent.rollNo || ""),
          undefined,
          {
            numeric: true,
            sensitivity: "base",
          }
        )
      );
  }, [
    students,
    search,
    courseFilter,
    batchFilter,
  ]);

  const summary = useMemo(() => {
    return students.reduce(
      (result, student) => {
        result.totalStudents += 1;

        result.totalFees += Number(
          student.totalFee || 0
        );

        result.totalPaid += Number(
          student.paidAmount || 0
        );

        result.totalPending += Number(
          student.pendingAmount || 0
        );

        return result;
      },
      {
        totalStudents: 0,
        totalFees: 0,
        totalPaid: 0,
        totalPending: 0,
      }
    );
  }, [students]);

  const openAddModal = () => {
    setEditingStudent(null);
    setFormData(initialForm);
    setFormErrors({});
    setSubmitError("");
    setShowFormModal(true);
  };

  const openEditModal = (student) => {
    setEditingStudent(student);

    setFormData({
      studentName:
        student.studentName || "",
      rollNo:
        student.rollNo || "",
      parentName:
        student.parentName || "",
      phone: student.phone || "",
      alternatePhone:
        student.alternatePhone || "",
      email: student.email || "",
      course: student.course || "",
      idproof: student.idproof || "",
      batch: student.batch || "",
      schoolName:
        student.schoolName || "",
      address: student.address || "",
    });

    setFormErrors({});
    setSubmitError("");
    setShowFormModal(true);
  };

  const openViewModal = (student) => {
    setSelectedStudent(student);
    setShowViewModal(true);
  };

  const openDeleteModal = (student) => {
    setSelectedStudent(student);
    setShowDeleteModal(true);
  };

  const closeFormModal = () => {
    setShowFormModal(false);
    setEditingStudent(null);
    setFormData(initialForm);
    setFormErrors({});
    setSubmitError("");
  };

  const closeViewModal = () => {
    setShowViewModal(false);
    setSelectedStudent(null);
  };

  const formatPhoneInput = (value) => {
    const digits = value.replace(/\D/g, "").slice(0, 10);

    if (digits.length <= 5) {
      return digits;
    }

    return `${digits.slice(0, 5)} ${digits.slice(5)}`;
  };

  const formatAadhaarInput = (value) => {
    const digits = value.replace(/\D/g, "").slice(0, 12);

    return digits
      .replace(/(\d{4})(?=\d)/g, "$1 ")
      .trim();
  };

  const handleChange = (event) => {
    const { name, value } =
      event.target;

    let nextValue = value;

    if (
      name === "phone" ||
      name === "alternatePhone"
    ) {
      nextValue = formatPhoneInput(value);
    }

    if (name === "idproof") {
      nextValue = formatAadhaarInput(value);
    }

    setFormData((current) => ({
      ...current,
      [name]: nextValue,
    }));

    setFormErrors((current) => ({
      ...current,
      [name]: "",
    }));

    setSubmitError("");
  };

  const validateForm = () => {
    const errors = {};

    if (!formData.studentName.trim()) {
      errors.studentName =
        "Student name is required";
    }

    if (!formData.rollNo.trim()) {
      errors.rollNo =
        "Roll number is required";
    }

    if (!formData.parentName.trim()) {
      errors.parentName =
        "Parent name is required";
    }

    if (!formData.phone.trim()) {
      errors.phone =
        "Phone number is required";
    } else if (
      !/^[6-9]\d{4} \d{5}$/.test(
        formData.phone.trim()
      )
    ) {
      errors.phone =
        "Enter phone as 98789 89789 and start with 6, 7, 8 or 9";
    }

    if (
      formData.alternatePhone &&
      !/^[6-9]\d{4} \d{5}$/.test(
        formData.alternatePhone.trim()
      )
    ) {
      errors.alternatePhone =
        "Enter alternate phone as 98789 89789 and start with 6, 7, 8 or 9";
    }

    if (
      formData.email.trim() &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        formData.email.trim()
      )
    ) {
      errors.email =
        "Enter a valid email address";
    }

    if (
      formData.phone.trim() &&
      formData.alternatePhone.trim() &&
      formData.phone.trim() ===
        formData.alternatePhone.trim()
    ) {
      errors.alternatePhone =
        "Phone and alternate phone cannot be the same";
    }

    if (!formData.course.trim()) {
      errors.course =
        "Course is required";
    }

    if (!formData.idproof.trim()) {
      errors.idproof =
        "Aadhaar number is required";
    } else if (
      !/^\d{4} \d{4} \d{4}$/.test(
        formData.idproof.trim()
      )
    ) {
      errors.idproof =
        "Enter Aadhaar as 1234 5678 9878";
    }

    setFormErrors(errors);

    const firstError =
      Object.values(errors)[0];

    if (firstError) {
      toast.error(firstError);
      return false;
    }

    return true;
  };

  const getBackendErrorMessage = (error) => {
    const responseData = error?.response?.data;

    if (!error?.response) {
      return "Unable to connect to the server. Please check your internet connection and try again.";
    }

    const message = responseData?.message;

    if (Array.isArray(message)) {
      return message.filter(Boolean).join(", ");
    }

    if (typeof message === "string" && message.trim()) {
      return message.trim();
    }

    if (
      typeof responseData?.error === "string" &&
      responseData.error.trim()
    ) {
      return responseData.error.trim();
    }

    if (error.response.status === 409) {
      return "This student information already exists.";
    }

    if (error.response.status === 400) {
      return "Please check the entered student details.";
    }

    return "Failed to save student. Please try again.";
  };

  const getBackendField = (message) => {
    const text = String(message || "").toLowerCase();

    if (text.includes("roll")) return "rollNo";

    if (
      text.includes("aadhaar") ||
      text.includes("aadhar") ||
      text.includes("id proof") ||
      text.includes("idproof")
    ) {
      return "idproof";
    }

    if (
      text.includes("alternative phone") ||
      text.includes("alternate phone")
    ) {
      return "alternatePhone";
    }

    if (text.includes("phone")) return "phone";
    if (text.includes("email")) return "email";
    if (text.includes("parent")) return "parentName";
    if (text.includes("student name")) return "studentName";
    if (text.includes("course")) return "course";

    return null;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitError("");

    if (!validateForm()) return;

    const payload = {
      studentName: formData.studentName.trim(),
      rollNo: formData.rollNo.trim(),
      parentName: formData.parentName.trim(),
      phone: formData.phone.trim(),
      alternatePhone:
        formData.alternatePhone.trim() || undefined,
      email:
        formData.email.trim().toLowerCase() || undefined,
      course: formData.course.trim(),
      idproof: formData.idproof.trim(),
      batch: formData.batch.trim() || undefined,
      schoolName:
        formData.schoolName.trim() || undefined,
      address: formData.address.trim() || undefined,
    };

    try {
      setIsSaving(true);

      if (editingStudent) {
        await api.patch(
          `/students/${editingStudent._id}`,
          payload
        );

        toast.success(
          "Student updated successfully"
        );
      } else {
        await api.post("/students", payload);

        toast.success(
          "Student added successfully"
        );
      }

      closeFormModal();
      await fetchStudents();
    } catch (error) {
      console.error(
        "Student save failed:",
        error?.response?.data || error
      );

      const backendMessage =
        getBackendErrorMessage(error);

      const backendField =
        getBackendField(backendMessage);

      setSubmitError(backendMessage);

      if (backendField) {
        setFormErrors((current) => ({
          ...current,
          [backendField]: backendMessage,
        }));

        requestAnimationFrame(() => {
          const fieldElement =
            document.querySelector(
              `[name="${backendField}"]`
            );

          fieldElement?.focus();
          fieldElement?.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
        });
      }

      toast.error(backendMessage, {
        duration: 5000,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedStudent) return;

    try {
      await api.delete(
        `/students/${selectedStudent._id}`
      );

      toast.success(
        "Student deleted successfully"
      );

      setShowDeleteModal(false);
      setSelectedStudent(null);

      await fetchStudents();
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          "Failed to delete student"
      );
    }
  };

  const handleAddCourse = async () => {
    const courseName = newCourseName.trim();

    if (!courseName) {
      toast.error("Course name is required");
      return;
    }

    try {
      setIsSetupSaving(true);
      await api.post("/academic/courses", { courseName });
      setNewCourseName("");
      await fetchAcademicSetup();
      toast.success("Course added successfully");
    } catch (error) {
      toast.error(
        getBackendErrorMessage(error) ||
          "Failed to add course"
      );
    } finally {
      setIsSetupSaving(false);
    }
  };

  const handleDeleteCourse = async (id) => {
    try {
      await api.delete(`/academic/courses/${id}`);
      await fetchAcademicSetup();
      toast.success("Course deleted successfully");
    } catch (error) {
      toast.error(
        getBackendErrorMessage(error) ||
          "Failed to delete course"
      );
    }
  };

  const handleBatchChange = (event) => {
    const { name, value } = event.target;

    setNewBatch((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleAddBatch = async () => {
    const batchName = newBatch.batchName.trim();
    const startTime = newBatch.startTime.trim().toUpperCase();
    const endTime = newBatch.endTime.trim().toUpperCase();

    if (!batchName || !startTime || !endTime) {
      toast.error("Batch name, start time and end time are required");
      return;
    }

    const normalTimePattern =
      /^(0?[1-9]|1[0-2]):[0-5][0-9] (AM|PM)$/;

    if (
      !normalTimePattern.test(startTime) ||
      !normalTimePattern.test(endTime)
    ) {
      toast.error("Enter time like 10:00 AM or 04:30 PM");
      return;
    }

    try {
      setIsSetupSaving(true);

      await api.post("/academic/batches", {
        batchName,
        startTime,
        endTime,
      });

      setNewBatch({
        batchName: "",
        startTime: "",
        endTime: "",
      });

      await fetchAcademicSetup();
      toast.success("Batch added successfully");
    } catch (error) {
      toast.error(
        getBackendErrorMessage(error) ||
          "Failed to add batch"
      );
    } finally {
      setIsSetupSaving(false);
    }
  };

  const handleSetupSave = async () => {
    const courseName = newCourseName.trim();
    const batchName = newBatch.batchName.trim();
    const startTime = newBatch.startTime.trim().toUpperCase();
    const endTime = newBatch.endTime.trim().toUpperCase();

    const hasCourse = Boolean(courseName);
    const hasAnyBatchValue = Boolean(batchName || startTime || endTime);
    const hasCompleteBatch = Boolean(batchName && startTime && endTime);

    if (!hasCourse && !hasAnyBatchValue) {
      setShowSetupModal(false);
      return;
    }

    if (hasAnyBatchValue && !hasCompleteBatch) {
      toast.error("Batch name, start time and end time are required");
      return;
    }

    const normalTimePattern =
      /^(0?[1-9]|1[0-2]):[0-5][0-9] (AM|PM)$/;

    if (
      hasCompleteBatch &&
      (!normalTimePattern.test(startTime) ||
        !normalTimePattern.test(endTime))
    ) {
      toast.error("Enter time like 10:00 AM or 04:30 PM");
      return;
    }

    try {
      setIsSetupSaving(true);
      const requests = [];

      if (hasCourse) {
        requests.push(
          api.post("/academic/courses", { courseName })
        );
      }

      if (hasCompleteBatch) {
        requests.push(
          api.post("/academic/batches", {
            batchName,
            startTime,
            endTime,
          })
        );
      }

      await Promise.all(requests);

      setNewCourseName("");
      setNewBatch({
        batchName: "",
        startTime: "",
        endTime: "",
      });

      await fetchAcademicSetup();
      setShowSetupModal(false);
      toast.success("Setup saved successfully");
    } catch (error) {
      toast.error(
        getBackendErrorMessage(error) ||
          "Failed to save setup"
      );
    } finally {
      setIsSetupSaving(false);
    }
  };

  const handleDeleteBatch = async (id) => {
    try {
      await api.delete(`/academic/batches/${id}`);
      await fetchAcademicSetup();
      toast.success("Batch deleted successfully");
    } catch (error) {
      toast.error(
        getBackendErrorMessage(error) ||
          "Failed to delete batch"
      );
    }
  };

  const formatBatchLabel = (batch) =>
    `${batch.batchName} — ${batch.startTime} - ${batch.endTime}`;

  const formatMoney = (value) =>
    Number(value || 0).toLocaleString(
      "en-IN"
    );

  const getStudentId = (student) => {
    if (student.studentId) {
      return student.studentId;
    }

    if (student._id) {
      return `SK-${student._id
        .slice(-8)
        .toUpperCase()}`;
    }

    return "-";
  };

  const openBulkUploadModal = () => {
    setShowBulkUploadModal(true);
    setBulkStage("select");
    setBulkFile(null);
    setBulkPreview(null);
    setBulkImportResult(null);
  };

  const closeBulkUploadModal = () => {
    if (isValidatingBulk || isImportingBulk) return;

    setShowBulkUploadModal(false);
    setBulkStage("select");
    setBulkFile(null);
    setBulkPreview(null);
    setBulkImportResult(null);
  };

  const handleDownloadTemplate = async () => {
    try {
      const response = await api.get(
        "/students/bulk-upload/template",
        { responseType: "blob" }
      );

      const url = window.URL.createObjectURL(
        response.data
      );

      const link = document.createElement("a");
      link.href = url;
      link.download =
        "sk-learnings-student-upload-template.xlsx";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          "Failed to download template"
      );
    }
  };

  const handleBulkFileChange = (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    const lowerName = file.name.toLowerCase();

    if (lowerName.endsWith(".xls")) {
      toast.error(
        "Legacy .xls files aren't supported. Please save the file as .xlsx or .csv and try again."
      );
      return;
    }

    if (
      !lowerName.endsWith(".xlsx") &&
      !lowerName.endsWith(".csv")
    ) {
      toast.error(
        "Please select a .xlsx or .csv file"
      );
      return;
    }

    setBulkFile(file);
  };

  const openBulkFilePicker = () => {
    bulkFileInputRef.current?.click();
  };

  const handleValidateBulkUpload = async () => {
    if (!bulkFile) {
      toast.error("Please select a file to upload");
      return;
    }

    try {
      setIsValidatingBulk(true);

      const formData = new FormData();
      formData.append("file", bulkFile);

      const response = await api.post(
        "/students/bulk-upload/preview",
        formData,
        {
          headers: {
            "Content-Type": undefined,
          },
        }
      );

      setBulkPreview(response.data);
      setBulkStage("preview");
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          "Failed to validate the uploaded file"
      );
    } finally {
      setIsValidatingBulk(false);
    }
  };

  const handleImportValidRows = async () => {
    if (!bulkPreview) return;

    const validRows = bulkPreview.rows.filter(
      (row) => row.status === "valid"
    );

    if (validRows.length === 0) {
      toast.error("There are no valid rows to import");
      return;
    }

    try {
      setIsImportingBulk(true);

      const response = await api.post(
        "/students/bulk-upload/import",
        {
          rows: validRows.map((row) => ({
            row: row.row,
            data: row.data,
          })),
        }
      );

      setBulkImportResult(response.data);
      setBulkStage("result");

      await fetchStudents();
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          "Failed to import students"
      );
    } finally {
      setIsImportingBulk(false);
    }
  };

  const handleDownloadErrorReport = () => {
    if (!bulkPreview) return;

    const rejectedFromPreview = bulkPreview.rows
      .filter((row) => row.status !== "valid")
      .map((row) => ({
        row: row.row,
        studentName: row.studentName,
        status: row.status,
        reason: row.reason,
      }));

    const rejectedFromImport = (
      bulkImportResult?.skipped || []
    ).map((row) => ({
      row: row.row,
      studentName: row.studentName,
      status: "invalid",
      reason: row.reason,
    }));

    const allRejected = [
      ...rejectedFromPreview,
      ...rejectedFromImport,
    ];

    if (allRejected.length === 0) {
      toast.error("No rejected rows to report");
      return;
    }

    const escapeCsv = (value) =>
      `"${String(value ?? "").replace(/"/g, '""')}"`;

    const csvLines = [
      ["Row", "Student Name", "Status", "Reason"]
        .map(escapeCsv)
        .join(","),

      ...allRejected.map((row) =>
        [row.row, row.studentName, row.status, row.reason]
          .map(escapeCsv)
          .join(",")
      ),
    ];

    const blob = new Blob([csvLines.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });

    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "student-upload-error-report.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="students-page">
      

      <div className="student-summary-grid">
        <div className="student-summary-card">
          <div className="summary-icon">
            <FiUsers />
          </div>

          <div className="summary-content">
            <span>
              Total Students
            </span>

            <strong>
              {summary.totalStudents}
            </strong>

            <small>
              Registered students
            </small>
          </div>
        </div>

        <div className="student-summary-card">
          <div className="summary-icon">
            <FiBookOpen />
          </div>

          <div className="summary-content">
            <span>Courses</span>

            <strong>
              {academicCourses.length || studentCourses.length}
            </strong>

            <small>
              Active course categories
            </small>
          </div>
        </div>


      </div>

      

      <section className="students-list-section">
        <div className="students-toolbar">
          <div className="student-search">
            <FiSearch />

            <input
              type="text"
              placeholder="Search by student name or mobile number..."
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
            />
          </div>

          <div className="student-filter-wrapper">
            <button
              type="button"
              className={`student-filter-button ${
                showFilters ? "active" : ""
              }`}
              onClick={() =>
                setShowFilters((current) => !current)
              }
            >
              <FiFilter />
              <span>Filter</span>

              {activeFilterCount > 0 && (
                <span className="student-filter-count">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {showFilters && (
              <div className="student-filter-dropdown">
                <div className="student-filter-header">
                  <strong>Filter Students</strong>

                  <div className="student-filter-header-actions">
                    {activeFilterCount > 0 && (
                      <button
                        type="button"
                        className="student-filter-clear-btn"
                        onClick={() => {
                          setCourseFilter("all");
                          setBatchFilter("all");
                        }}
                      >
                        Clear
                      </button>
                    )}

                    <button
                      type="button"
                      className="student-filter-close-btn"
                      onClick={() => setShowFilters(false)}
                      aria-label="Close filters"
                      title="Close filters"
                    >
                      <FiX />
                    </button>
                  </div>
                </div>

                <div className="student-filter-field">
                  <label>Course</label>

                  <select
                    value={courseFilter}
                    onChange={(event) =>
                      setCourseFilter(event.target.value)
                    }
                  >
                    <option value="all">
                      All Courses
                    </option>

                    {(academicCourses.length
                      ? academicCourses.map(
                          (course) => course.courseName
                        )
                      : studentCourses
                    ).map((course) => (
                      <option
                        key={course}
                        value={course}
                      >
                        {course}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="student-filter-field">
                  <label>Batch</label>

                  <select
                    value={batchFilter}
                    onChange={(event) =>
                      setBatchFilter(event.target.value)
                    }
                  >
                    <option value="all">
                      All Batches
                    </option>

                    {academicBatches.map((batch) => {
                      const label =
                        formatBatchLabel(batch);

                      return (
                        <option
                          key={batch._id}
                          value={label}
                        >
                          {label}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>
            )}
          </div>

          {canAddStudent && (
            <div className="students-header-actions">
              <button
                type="button"
                className="upload-excel-btn"
                onClick={openBulkUploadModal}
              >
                <FiUploadCloud />
                <span>Upload Excel</span>
              </button>

              <button
                type="button"
                className="add-student-btn"
                onClick={openAddModal}
              >
                <FiPlus />
                <span>Add Student</span>
              </button>
            </div>
          )}
        </div>

        <div className="students-table-card">
          {isLoading ? (
            <div className="students-message">
              <div className="loading-circle" />

              <span>
                Loading students...
              </span>
            </div>
          ) : filteredStudents.length ===
            0 ? (
            <div className="students-message">
              <FiUsers />

              <strong>
                No students found
              </strong>

              <span>
                Try changing your search
                or filter
              </span>
            </div>
          ) : (
            <div className="students-table-wrapper">
              <table className="students-table">
                <thead>
                  <tr>
                    <th>S.No</th>
                    {canViewNameColumn && (
                      <th>Student</th>
                    )}
                    {canViewRollNoColumn && (
                      <th>Roll No</th>
                    )}
                    {canViewCourseColumn && (
                      <th>Course</th>
                    )}
                    {canViewPhoneColumn && (
                      <th>Phone</th>
                    )}
                    {canViewFees && (
                      <th>Total Fee</th>
                    )}
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredStudents.map(
                    (student, index) => (
                      <tr
                        key={student._id}
                        className="student-clickable-row"
                        onClick={() => openViewModal(student)}
                      >
                        <td>
                          <span className="serial-number">
                            {index + 1}
                          </span>
                        </td>

                        {canViewNameColumn && (
                          <td>
                            <div className="student-profile-cell">
                              <div className="student-avatar">
                                {student.studentName
                                  ?.charAt(0)
                                  ?.toUpperCase() ||
                                  "S"}
                              </div>

                              <div className="student-name-cell">
                                <strong>
                                  {
                                    student.studentName
                                  }
                                </strong>

                                <span>
                                  Parent:{" "}
                                  {
                                    student.parentName
                                  }
                                </span>
                              </div>
                            </div>
                          </td>
                        )}

                        {canViewRollNoColumn && (
                          <td>
                            <span className="roll-number-badge">
                              {student.rollNo || "-"}
                            </span>
                          </td>
                        )}

                        {canViewCourseColumn && (
                          <td>
                            <span className="course-badge">
                              {
                                student.course
                              }
                            </span>
                          </td>
                        )}

                        {canViewPhoneColumn && (
                          <td>
                            {student.phone}
                          </td>
                        )}

                        {canViewFees && (
                          <td>
                            {student.totalFee !== undefined &&
                            student.totalFee !== null
                              ? `₹${formatMoney(student.totalFee)}`
                              : "-"}
                          </td>
                        )}

                        <td>
                          <div className="student-actions">
                            <button
                              type="button"
                              title="View Student"
                              onClick={(event) => {
                                event.stopPropagation();
                                openViewModal(student);
                              }}
                            >
                              <FiEye />
                            </button>

                            {canEditStudent && (
                              <button
                                type="button"
                                title="Edit Student"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  openEditModal(student);
                                }}
                              >
                                <FiEdit2 />
                              </button>
                            )}

                            {canDeleteStudent && (
                              <button
                                type="button"
                                title="Delete Student"
                                className="delete-btn"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  openDeleteModal(student);
                                }}
                              >
                                <FiTrash2 />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      

      {showSetupModal && (
        <div className="student-modal-overlay">
          <div className="student-modal setup-modal">
            <div className="student-modal-header">
              <div className="modal-heading-content">
                <span className="modal-icon">
                  <FiSettings />
                </span>

                <div>
                  <h2>Student Setup</h2>
                  <p>
                    Manage courses and batches used in Add Student
                  </p>
                </div>
              </div>

              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setShowSetupModal(false)}
              >
                <FiX />
              </button>
            </div>

            <div className="setup-modal-body">
              <section className="setup-section">
                <div className="setup-section-heading">
                  <div>
                    <h3>Courses</h3>
                    <p>Add the courses available in the institute</p>
                  </div>
                </div>

                <div className="setup-add-row">
                  <input
                    type="text"
                    value={newCourseName}
                    onChange={(event) =>
                      setNewCourseName(event.target.value)
                    }
                    placeholder="Example: NEET"
                  />


                </div>

                <div className="setup-items">
                  {academicCourses.length === 0 ? (
                    <div className="setup-empty">
                      No courses added yet
                    </div>
                  ) : (
                    academicCourses.map((course) => (
                      <div
                        className="setup-item"
                        key={course._id}
                      >
                        <div>
                          <strong>{course.courseName}</strong>
                          <span>Course</span>
                        </div>

                        <button
                          type="button"
                          className="setup-delete-btn"
                          onClick={() =>
                            handleDeleteCourse(course._id)
                          }
                          title="Delete course"
                        >
                          <FiTrash2 />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </section>

              <section className="setup-section">
                <div className="setup-section-heading">
                  <div>
                    <h3>Batches</h3>
                    <p>
                      Add batch name with normal AM/PM timing
                    </p>
                  </div>
                </div>

                <div className="setup-batch-grid">
                  <input
                    type="text"
                    name="batchName"
                    value={newBatch.batchName}
                    onChange={handleBatchChange}
                    placeholder="Batch name - Morning"
                  />

                  <input
                    type="text"
                    name="startTime"
                    value={newBatch.startTime}
                    onChange={handleBatchChange}
                    placeholder="Start - 10:00 AM"
                  />

                  <input
                    type="text"
                    name="endTime"
                    value={newBatch.endTime}
                    onChange={handleBatchChange}
                    placeholder="End - 11:00 AM"
                  />


                </div>

                <div className="setup-items">
                  {academicBatches.length === 0 ? (
                    <div className="setup-empty">
                      No batches added yet
                    </div>
                  ) : (
                    academicBatches.map((batch) => (
                      <div
                        className="setup-item"
                        key={batch._id}
                      >
                        <div>
                          <strong>
                            {formatBatchLabel(batch)}
                          </strong>
                          <span>Batch & Timing</span>
                        </div>

                        <button
                          type="button"
                          className="setup-delete-btn"
                          onClick={() =>
                            handleDeleteBatch(batch._id)
                          }
                          title="Delete batch"
                        >
                          <FiTrash2 />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </section>


              <div className="setup-modal-actions">
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => setShowSetupModal(false)}
                  disabled={isSetupSaving}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  className="primary-btn setup-save-btn"
                  onClick={handleSetupSave}
                  disabled={isSetupSaving}
                >
                  <FiSave />
                  {isSetupSaving ? "Saving..." : "Save"}
                </button>
              </div>            </div>
          </div>
        </div>
      )}

      {showFormModal && (
        <div className="student-modal-overlay">
          <div className="student-modal form-modal">
            <div className="student-modal-header">
              <div className="modal-heading-content">
                <span className="modal-icon">
                  <FiUser />
                </span>

                <div>
                  <h2>
                    {editingStudent
                      ? "Edit Student"
                      : "Add Student"}
                  </h2>

                  <p>
                    {editingStudent
                      ? "Update student information"
                      : "Enter student information to create a new record"}
                  </p>
                </div>
              </div>

              <button
                type="button"
                className="modal-close-btn"
                onClick={closeFormModal}
              >
                <FiX />
              </button>
            </div>

            <form
              className="student-form"
              onSubmit={handleSubmit}
              noValidate
            >
              {submitError && (
                <div
                  className="student-submit-error"
                  role="alert"
                >
                  {submitError}
                </div>
              )}

              <div className="student-form-section-title">
                Personal Information
              </div>

              <div className="form-grid">
                <div className="student-form-group">
                  <label>
                    Student Name *
                  </label>

                  <input
                    name="studentName"
                    value={
                      formData.studentName
                    }
                    onChange={
                      handleChange
                    }
                    placeholder="Enter student name"
                    required
                    className={
                      formErrors.studentName
                        ? "input-error"
                        : ""
                    }
                  />

                  {formErrors.studentName && (
                    <small className="form-error-text">
                      {formErrors.studentName}
                    </small>
                  )}
                </div>

                <div className="student-form-group">
                  <label>
                    Roll No *
                  </label>

                  <input
                    name="rollNo"
                    value={formData.rollNo}
                    onChange={handleChange}
                    placeholder="Enter roll number"
                    required
                    className={
                      formErrors.rollNo
                        ? "input-error"
                        : ""
                    }
                  />

                  {formErrors.rollNo && (
                    <small className="form-error-text">
                      {formErrors.rollNo}
                    </small>
                  )}
                </div>

                <div className="student-form-group">
                  <label>
                    Parent Name *
                  </label>

                  <input
                    name="parentName"
                    value={
                      formData.parentName
                    }
                    onChange={
                      handleChange
                    }
                    placeholder="Enter parent name"
                    required
                    className={
                      formErrors.parentName
                        ? "input-error"
                        : ""
                    }
                  />

                  {formErrors.parentName && (
                    <small className="form-error-text">
                      {formErrors.parentName}
                    </small>
                  )}
                </div>

                <div className="student-form-group">
                  <label>
                    Phone Number *
                  </label>

                  <input
                    name="phone"
                    maxLength="11"
                    inputMode="numeric"
                    value={
                      formData.phone
                    }
                    onChange={
                      handleChange
                    }
                    placeholder="Phone Number"
                    required
                    className={
                      formErrors.phone
                        ? "input-error"
                        : ""
                    }
                  />

                  {formErrors.phone && (
                    <small className="form-error-text">
                      {formErrors.phone}
                    </small>
                  )}
                </div>

                <div className="student-form-group">
                  <label>
                    Alternate Phone
                  </label>

                  <input
                    name="alternatePhone"
                    maxLength="11"
                    inputMode="numeric"
                    value={
                      formData.alternatePhone
                    }
                    onChange={
                      handleChange
                    }
                    placeholder="Alternate Number"
                    className={
                      formErrors.alternatePhone
                        ? "input-error"
                        : ""
                    }
                  />

                  {formErrors.alternatePhone && (
                    <small className="form-error-text">
                      {formErrors.alternatePhone}
                    </small>
                  )}
                </div>

                <div className="student-form-group">
                  <label>
                    Aadhaar Number *
                  </label>

                  <input
                    name="idproof"
                    maxLength="14"
                    inputMode="numeric"
                    value={formData.idproof}
                    onChange={handleChange}
                    placeholder="1234 5678 9878"
                    required
                    className={
                      formErrors.idproof
                        ? "input-error"
                        : ""
                    }
                  />

                  {formErrors.idproof && (
                    <small className="form-error-text">
                      {formErrors.idproof}
                    </small>
                  )}
                </div>

                <div className="student-form-group full-width">
                  <label>
                    Email Address
                  </label>

                  <input
                    type="email"
                    name="email"
                    value={
                      formData.email
                    }
                    onChange={
                      handleChange
                    }
                    placeholder="student@email.com"
                    className={
                      formErrors.email
                        ? "input-error"
                        : ""
                    }
                  />

                  {formErrors.email && (
                    <small className="form-error-text">
                      {formErrors.email}
                    </small>
                  )}
                </div>
              </div>

              <div className="student-form-section-title">
                Academic Information
              </div>

              <div className="form-grid">
                <div className="student-form-group">
                  <label>
                    Course *
                  </label>

                  <select
                    name="course"
                    value={
                      formData.course
                    }
                    onChange={
                      handleChange
                    }
                    required
                    className={
                      formErrors.course
                        ? "input-error"
                        : ""
                    }
                  >
                    <option value="">
                      Select course
                    </option>

                    {academicCourses.map((course) => (
                      <option
                        key={course._id}
                        value={course.courseName}
                      >
                        {course.courseName}
                      </option>
                    ))}
                  </select>

                  {formErrors.course && (
                    <small className="form-error-text">
                      {formErrors.course}
                    </small>
                  )}
                </div>

                <div className="student-form-group">
                  <label>Batch</label>

                  <select
                    name="batch"
                    value={formData.batch}
                    onChange={handleChange}
                  >
                    <option value="">
                      Select batch
                    </option>

                    {academicBatches.map((batch) => {
                      const label = formatBatchLabel(batch);

                      return (
                        <option
                          key={batch._id}
                          value={label}
                        >
                          {label}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div className="student-form-group">
                  <label>
                    School Name
                  </label>

                  <input
                    name="schoolName"
                    value={
                      formData.schoolName
                    }
                    onChange={
                      handleChange
                    }
                    placeholder="Enter school name"
                  />
                </div>

                <div className="student-form-group full-width">
                  <label>
                    Address
                  </label>

                  <textarea
                    name="address"
                    value={
                      formData.address
                    }
                    onChange={
                      handleChange
                    }
                    placeholder="Enter student address"
                    rows="3"
                  />
                </div>
              </div>

              <div className="student-form-actions">
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={
                    closeFormModal
                  }
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="primary-btn"
                  disabled={
                    isSaving
                  }
                >
                  {isSaving
                    ? "Saving..."
                    : editingStudent
                      ? "Update Student"
                      : "Add Student"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      

      {showViewModal &&
        selectedStudent && (
          <div className="student-modal-overlay student-id-overlay">
            <div className="student-id-modal">
              <button
                type="button"
                className="student-id-close"
                onClick={
                  closeViewModal
                }
              >
                <FiX />
              </button>

              <div className="student-id-card">
                

                <div className="student-id-top">
                  <div className="student-id-brand">
                    <img
                      src={logo}
                      alt="SK Learnings"
                    />

                    <div>
                      <h3>
                        THE SK LEARNINGS
                      </h3>

                      <p>
                        PRIVATE EDUCATIONAL
                        SERVICES
                      </p>
                    </div>
                  </div>

                  <div className="student-id-document">
                    <FaGraduationCap />

                    <span>
                      STUDENT IDENTITY
                    </span>
                  </div>
                </div>

                

                <div className="student-id-profile-row">
                  <div className="student-id-photo-wrap">
                    <div className="student-id-photo">
                      {selectedStudent.studentName
                        ?.charAt(0)
                        ?.toUpperCase() ||
                        "S"}
                    </div>

                    <span>
                      <i />
                      Active Student
                    </span>
                  </div>

                  <div className="student-id-main-info">
                    <small>
                      STUDENT NAME
                    </small>

                    <h2>
                      {
                        selectedStudent.studentName
                      }
                    </h2>

                    <div className="student-id-course-row">
                      <span>
                        <FiBookOpen />
                        {
                          selectedStudent.course
                        }
                      </span>

                      <span>
                        <FiUsers />
                        {selectedStudent.batch ||
                          "No Batch"}
                      </span>
                    </div>

                    <div className="student-id-number">
                      <span>
                        ROLL NO
                      </span>

                      <strong>
                        {selectedStudent.rollNo || "-"}
                      </strong>
                    </div>
                  </div>
                </div>

                

                <div className="student-id-details-grid">
                  <IdDetail
                    icon={<FiUser />}
                    label="Parent Name"
                    value={
                      selectedStudent.parentName
                    }
                  />

                  {canViewPhoneNumberDetail && (
                    <IdDetail
                      icon={<FiPhone />}
                      label="Phone Number"
                      value={
                        selectedStudent.phone
                      }
                    />
                  )}

                  <IdDetail
                    icon={<FiPhone />}
                    label="Alternate Phone"
                    value={
                      selectedStudent.alternatePhone ||
                      "-"
                    }
                  />

                  <IdDetail
                    icon={<FiMail />}
                    label="Email Address"
                    value={
                      selectedStudent.email ||
                      "-"
                    }
                  />

                  <IdDetail
                    icon={
                      <FiBookOpen />
                    }
                    label="School"
                    value={
                      selectedStudent.schoolName ||
                      "-"
                    }
                  />

                  {canViewAadharDetail && (
                    <IdDetail
                      icon={
                        <FiCreditCard />
                      }
                      label="Aadhaar Number"
                      value={
                        selectedStudent.idproof ||
                        "-"
                      }
                    />
                  )}
                </div>



                {canViewFees && (
                  <div className="student-id-fees">
                    <div>
                      <span>
                        Total Fee
                      </span>

                      <strong>
                        {selectedStudent.totalFee !== undefined &&
                        selectedStudent.totalFee !== null
                          ? `₹${formatMoney(selectedStudent.totalFee)}`
                          : "No fee generated yet"}
                      </strong>
                    </div>
                  </div>
                )}



                {canViewAddressDetail && (
                  <div className="student-id-address">
                    <FiMapPin />

                    <div>
                      <span>
                        Residential Address
                      </span>

                      <p>
                        {selectedStudent.address ||
                          "-"}
                      </p>
                    </div>
                  </div>
                )}

                

                <div className="student-id-footer">
                  <span>
                    MEDICAL • ENGINEERING •
                    FOUNDATIONS • JUNIOR IAS
                  </span>

                  <strong>
                    THE SK LEARNINGS
                  </strong>
                </div>
              </div>
            </div>
          </div>
        )}

      

      {showDeleteModal &&
        selectedStudent && (
          <div className="student-modal-overlay">
            <div className="student-modal delete-modal">
              <div className="delete-icon">
                <FiTrash2 />
              </div>

              <h2>
                Delete Student?
              </h2>

              <p>
                Are you sure you want
                to delete{" "}
                <strong>
                  {
                    selectedStudent.studentName
                  }
                </strong>
                ? This student record
                will be removed.
              </p>

              <div className="delete-actions">
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => {
                    setShowDeleteModal(
                      false
                    );

                    setSelectedStudent(
                      null
                    );
                  }}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  className="confirm-delete-btn"
                  onClick={
                    handleDelete
                  }
                >
                  Delete Student
                </button>
              </div>
            </div>
          </div>
        )}

      {showBulkUploadModal && (
        <div className="student-modal-overlay">
          <div className="student-modal bulk-upload-modal">
            <div className="student-modal-header">
              <div className="modal-heading-content">
                <span className="modal-icon">
                  <FiUploadCloud />
                </span>

                <div>
                  <h2>Bulk Student Upload</h2>
                  <p>
                    {bulkStage === "select" &&
                      "Upload an Excel or CSV file to add multiple students at once"}
                    {bulkStage === "preview" &&
                      "Review the results before importing"}
                    {bulkStage === "result" &&
                      "Import summary"}
                  </p>
                </div>
              </div>

              <button
                type="button"
                className="modal-close-btn"
                onClick={closeBulkUploadModal}
                disabled={isValidatingBulk || isImportingBulk}
              >
                <FiX />
              </button>
            </div>

            <div className="bulk-upload-body">
              {bulkStage === "select" && (
                <>
                  <button
                    type="button"
                    className="bulk-template-btn"
                    onClick={handleDownloadTemplate}
                  >
                    <FiDownload />
                    Download Excel Template
                  </button>

                  <input
                    ref={bulkFileInputRef}
                    type="file"
                    accept=".xlsx,.csv"
                    className="bulk-upload-file-input"
                    onChange={handleBulkFileChange}
                  />

                  <button
                    type="button"
                    className="bulk-upload-dropzone"
                    onClick={openBulkFilePicker}
                    disabled={isValidatingBulk}
                  >
                    <FiUploadCloud />

                    {bulkFile ? (
                      <strong>{bulkFile.name}</strong>
                    ) : (
                      <strong>
                        Click to select a file
                      </strong>
                    )}

                    <span>
                      Supported formats: .xlsx, .csv
                      (legacy .xls is not supported)
                    </span>
                  </button>
                </>
              )}

              {bulkStage === "preview" &&
                bulkPreview && (
                  <>
                    <div className="bulk-summary-grid">
                      <div className="bulk-summary-card">
                        <span>Total Rows</span>
                        <strong>
                          {bulkPreview.summary.totalRows}
                        </strong>
                      </div>

                      <div className="bulk-summary-card is-valid">
                        <span>Valid</span>
                        <strong>
                          {bulkPreview.summary.validRows}
                        </strong>
                      </div>

                      <div className="bulk-summary-card is-duplicate">
                        <span>Duplicate</span>
                        <strong>
                          {
                            bulkPreview.summary
                              .duplicateRows
                          }
                        </strong>
                      </div>

                      <div className="bulk-summary-card is-invalid">
                        <span>Invalid</span>
                        <strong>
                          {bulkPreview.summary.invalidRows}
                        </strong>
                      </div>
                    </div>

                    <div className="bulk-preview-table-wrapper">
                      <table className="bulk-preview-table">
                        <thead>
                          <tr>
                            <th>Row</th>
                            <th>Student Name</th>
                            <th>Status</th>
                            <th>Reason</th>
                          </tr>
                        </thead>

                        <tbody>
                          {bulkPreview.rows.map((row) => (
                            <tr key={row.row}>
                              <td>{row.row}</td>
                              <td>{row.studentName}</td>
                              <td>
                                <span
                                  className={`bulk-status-pill is-${row.status}`}
                                >
                                  {row.status ===
                                    "valid" && (
                                    <FiCheckCircle />
                                  )}
                                  {row.status ===
                                    "duplicate" && (
                                    <FiAlertTriangle />
                                  )}
                                  {row.status ===
                                    "invalid" && (
                                    <FiXCircle />
                                  )}
                                  {row.status}
                                </span>
                              </td>
                              <td>{row.reason}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}

              {bulkStage === "result" &&
                bulkImportResult && (
                  <div className="bulk-summary-grid">
                    <div className="bulk-summary-card">
                      <span>Total Rows</span>
                      <strong>
                        {bulkImportResult.totalRows}
                      </strong>
                    </div>

                    <div className="bulk-summary-card is-valid">
                      <span>Successfully Added</span>
                      <strong>
                        {bulkImportResult.successCount}
                      </strong>
                    </div>

                    <div className="bulk-summary-card is-duplicate">
                      <span>Duplicates Skipped</span>
                      <strong>
                        {
                          bulkImportResult.duplicateSkipped
                        }
                      </strong>
                    </div>

                    <div className="bulk-summary-card is-invalid">
                      <span>Invalid Skipped</span>
                      <strong>
                        {bulkImportResult.invalidSkipped}
                      </strong>
                    </div>
                  </div>
                )}
            </div>

            <div className="bulk-upload-actions">
              {bulkStage === "select" && (
                <>
                  <button
                    type="button"
                    className="secondary-btn"
                    onClick={closeBulkUploadModal}
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    className="primary-btn"
                    onClick={handleValidateBulkUpload}
                    disabled={!bulkFile || isValidatingBulk}
                  >
                    {isValidatingBulk
                      ? "Validating..."
                      : "Validate & Preview"}
                  </button>
                </>
              )}

              {bulkStage === "preview" && (
                <>
                  <button
                    type="button"
                    className="secondary-btn"
                    onClick={closeBulkUploadModal}
                    disabled={isImportingBulk}
                  >
                    Cancel
                  </button>

                  {bulkPreview.summary.totalRows -
                    bulkPreview.summary.validRows >
                    0 && (
                    <button
                      type="button"
                      className="secondary-btn"
                      onClick={handleDownloadErrorReport}
                    >
                      <FiFileText />
                      Error Report
                    </button>
                  )}

                  <button
                    type="button"
                    className="primary-btn"
                    onClick={handleImportValidRows}
                    disabled={
                      isImportingBulk ||
                      bulkPreview.summary.validRows === 0
                    }
                  >
                    {isImportingBulk
                      ? "Importing..."
                      : `Import Valid Students (${bulkPreview.summary.validRows})`}
                  </button>
                </>
              )}

              {bulkStage === "result" && (
                <>
                  {(bulkImportResult.duplicateSkipped > 0 ||
                    bulkImportResult.invalidSkipped >
                      0) && (
                    <button
                      type="button"
                      className="secondary-btn"
                      onClick={handleDownloadErrorReport}
                    >
                      <FiFileText />
                      Error Report
                    </button>
                  )}

                  <button
                    type="button"
                    className="primary-btn"
                    onClick={closeBulkUploadModal}
                  >
                    Done
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const IdDetail = ({
  icon,
  label,
  value,
}) => {
  return (
    <div className="student-id-detail">
      <div className="student-id-detail-icon">
        {icon}
      </div>

      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </div>
  );
};

export default Students;
