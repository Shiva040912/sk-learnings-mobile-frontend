import { useEffect, useMemo, useRef, useState } from "react";
import {
  FiBell,
  FiCheck,
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiCreditCard,
  FiDollarSign,
  FiEdit2,
  FiFilter,
  FiSearch,
  FiSettings,
  FiSave,
  FiImage,
  FiPlus,
  FiUpload,
  FiUser,
  FiUsers,
  FiTrash2,
  FiX,
} from "react-icons/fi";
import toast from "react-hot-toast";

import api from "../services/axios";
import { usePermissions } from "../hooks/usePermissions";
import "../styles/payments.css";

const Payments = () => {
  const { hasPermission, hasGlobalPermission } = usePermissions();

  // The master money switch — controls whether any fee AMOUNT (not proof
  // images, methods or dates) is visible anywhere on this page, on top of
  // whatever the more specific column/section toggle below says. Admin
  // passes it automatically via usePermissions' isAdmin bypass; the
  // backend enforces the same flag independently (omitFeeFields /
  // omitAmount / getFeeCycles), so hiding it here is a UI nicety on top of
  // real server-side stripping, not the only thing standing in the way.
  const canSeeFees = hasGlobalPermission("fees");

  const canViewSummary = hasPermission(
    "payments",
    "sections",
    "summary"
  );

  const canViewPhoneColumn = hasPermission(
    "payments",
    "columns",
    "phone"
  );

  const canViewProofColumn = hasPermission(
    "payments",
    "columns",
    "proof"
  );

  const canViewTotalFeeColumn =
    canSeeFees &&
    hasPermission("payments", "columns", "totalFee");

  const canViewStatusColumn = hasPermission(
    "payments",
    "columns",
    "status"
  );

  const canViewPaymentDetails = hasPermission(
    "payments",
    "actions",
    "viewDetails"
  );

  const canCollectPayment = hasPermission(
    "payments",
    "actions",
    "collect"
  );

  const canEditFee = hasPermission(
    "payments",
    "actions",
    "editFee"
  );

  const canSeeProofNotification = hasPermission(
    "payments",
    "actions",
    "proofNotification"
  );

  const canViewFeeBreakdown =
    canSeeFees &&
    hasPermission("payments", "sections", "feeBreakdown");

  // Whether real totalFee/paidAmount/pendingAmount numbers are even present
  // in this trainer's copy of a student record — governed by the same
  // global `fees` flag the backend already strips those fields on (see
  // StudentsService.omitFeeFields), not by this page's own column/section
  // display toggles above. Used only where the *value* is read for
  // arithmetic/validation, as opposed to just deciding whether to show a
  // UI element.
  const canSeeStudentFeeNumbers = canSeeFees;

  const [students, setStudents] = useState([]);
  const [paymentRecords, setPaymentRecords] = useState([]);
  const [feeDueDate, setFeeDueDate] = useState("");
  const [selectedDueDate, setSelectedDueDate] = useState("");
  const [search, setSearch] = useState("");
  const [methodFilter, setMethodFilter] = useState("all");
  const [courseFilter, setCourseFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [batchFilter, setBatchFilter] = useState("all");
  // "new" = student currently has an unprocessed payment screenshot pending
  // Admin action — same underlying condition as the red notification dot
  // (payment.paymentProofImage truthy). Cleared automatically once Admin
  // collects the payment or a new fee cycle is generated (backend clears
  // paymentProofImage at that point), so this never needs manual reset.
  const [screenshotFilter, setScreenshotFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingDueDate, setIsSavingDueDate] = useState(false);
  const [isSendingReminders, setIsSendingReminders] = useState(false);
  const [showReminderMenu, setShowReminderMenu] = useState(false);
  const [showIndividualPicker, setShowIndividualPicker] = useState(false);
  const [selectedReminderIds, setSelectedReminderIds] = useState([]);
  const [reminderSearch, setReminderSearch] = useState("");
  const [showMessageTypePicker, setShowMessageTypePicker] = useState(false);
  const [notificationTarget, setNotificationTarget] = useState({
    type: "",
    studentIds: [],
  });
  const [studentNotificationMenu, setStudentNotificationMenu] = useState(null);
  const [studentNotificationAnchor, setStudentNotificationAnchor] =
    useState(null);
  const studentNotificationMenuRef = useRef(null);
  const studentNotificationFloatingMenuRef = useRef(null);

  const [collectModalStudent, setCollectModalStudent] = useState(null);
  const [collectAmountInput, setCollectAmountInput] = useState("");
  const [collectMethodInput, setCollectMethodInput] = useState("");
  const [isCollectingPayment, setIsCollectingPayment] = useState(false);
  const [showCollectHistory, setShowCollectHistory] = useState(false);
  const [isRefreshingCollectModal, setIsRefreshingCollectModal] =
    useState(false);

  const [historyDeleteTarget, setHistoryDeleteTarget] = useState(null);
  const [isDeletingHistory, setIsDeletingHistory] = useState(false);

  const [generateFeeStudent, setGenerateFeeStudent] = useState(null);
  const [generateFeeAmountInput, setGenerateFeeAmountInput] = useState("");
  const [isGeneratingFee, setIsGeneratingFee] = useState(false);

  const [historyFeeCycles, setHistoryFeeCycles] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [viewingHistoryRecord, setViewingHistoryRecord] = useState(null);

  const [showPaymentSettings, setShowPaymentSettings] = useState(false);
  const [isSavingPaymentSettings, setIsSavingPaymentSettings] = useState(false);
  const [paymentSettings, setPaymentSettings] = useState({
    upiId: "",
    receiverName: "",
    paymentPhone: "",
    upiQrImage: "",
  });

  // Returns the freshly-fetched arrays (not just setting state) so a caller
  // that needs the data *right now* — e.g. opening the collect/proof popup
  // — doesn't have to wait a render cycle for state to catch up. `silent`
  // skips the page-level loading spinner for on-demand refreshes that
  // shouldn't blank out the table underneath an already-open modal.
  const fetchPaymentPageData = async (silent = false) => {
    try {
      if (!silent) setIsLoading(true);

      // /students/for-payments (not /students) — gated by the Payments
      // page's own access permission, so a Trainer with Payments access
      // but no Students page access can still load this page.
      const [studentsResponse, paymentsResponse] = await Promise.all([
        api.get("/students/for-payments"),
        api.get("/payments"),
      ]);

      const freshStudents = studentsResponse.data || [];
      const freshPaymentRecords = paymentsResponse.data || [];

      setStudents(freshStudents);
      setPaymentRecords(freshPaymentRecords);

      return {
        students: freshStudents,
        paymentRecords: freshPaymentRecords,
      };
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to load payment details",
      );

      return null;
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  const fetchFeeDueDate = async () => {
    try {
      const response = await api.get("/payments/due-date");
      const date = response.data?.feeDueDate || "";

      if (date) {
        const formattedDate = new Date(date).toISOString().split("T")[0];

        setFeeDueDate(formattedDate);
        setSelectedDueDate(formattedDate);
      }
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to load fee due date",
      );
    }
  };

  const fetchPaymentSettings = async () => {
    try {
      const response = await api.get("/payments/settings");

      setPaymentSettings({
        upiId: response.data?.upiId || "",
        receiverName: response.data?.receiverName || "",
        paymentPhone: response.data?.paymentPhone || "",
        upiQrImage: response.data?.upiQrImage || "",
      });
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to load UPI settings",
      );
    }
  };

  useEffect(() => {
    fetchPaymentPageData();
    fetchFeeDueDate();
    fetchPaymentSettings();

    const handleWindowFocus = () => {
      fetchPaymentPageData();
      fetchFeeDueDate();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        fetchPaymentPageData();
        fetchFeeDueDate();
      }
    };

    window.addEventListener("focus", handleWindowFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("focus", handleWindowFocus);

      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (
        studentNotificationMenuRef.current &&
        !studentNotificationMenuRef.current.contains(event.target) &&
        !studentNotificationFloatingMenuRef.current?.contains(event.target)
      ) {
        setStudentNotificationMenu(null);
        setStudentNotificationAnchor(null);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);

    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key !== "Escape") return;

      setStudentNotificationMenu(null);
      setStudentNotificationAnchor(null);
    };

    document.addEventListener("keydown", handleEscape);

    return () => document.removeEventListener("keydown", handleEscape);
  }, []);

  // Pure — shared by the memoized table rows and by anything (e.g. opening
  // the collect/proof popup) that needs a freshly-fetched row built outside
  // the students/paymentRecords state, so it isn't stuck waiting a render
  // cycle for that state to catch up.
  const buildPaymentRow = (student, records) => {
    const studentPaymentRecords = records.filter(
      (payment) =>
        String(payment.studentId) === String(student._id) ||
        String(payment.student?._id) === String(student._id),
    );

    // Only used to surface "last collected on/via" on the aggregated row —
    // the full per-cycle history now comes from GET /students/:id/fee-cycles
    // (fetched on demand when the History panel opens), not from here.
    const latestPayment = [...studentPaymentRecords].sort(
      (firstPayment, secondPayment) =>
        new Date(secondPayment.paymentDate || 0) -
        new Date(firstPayment.paymentDate || 0),
    )[0];

    // `paymentStatus` is only ever set once a fee cycle has been generated
    // for this student (see generateFeeCycle on the backend) — missing
    // means "no fee generated yet", NOT "unpaid". Those are different
    // Status-column states ("+" vs "Unpaid").
    const hasFeeCycle = Boolean(student.paymentStatus);
    const status = student.paymentStatus || null;
    const hasCollectedAnything = status && status !== "unpaid";
    const totalFee = Number(student.totalFee || 0);
    const paidAmount = Number(student.paidAmount || 0);

    return {
      _id: student._id,
      studentName: student.studentName || "-",
      rollNo: student.rollNo || "-",
      course: student.course || "-",
      batch: student.batch || "-",
      phone: student.phone || "-",
      hasFeeCycle,
      totalFee,
      paidAmount,
      pendingAmount: Number(
        student.pendingAmount ?? Math.max(0, totalFee - paidAmount),
      ),
      paymentStatus: status,
      paymentDate: hasCollectedAnything
        ? latestPayment?.paymentDate || student.updatedAt || null
        : null,
      paymentMethod: hasCollectedAnything
        ? latestPayment?.paymentMethod || student.paymentMethod || ""
        : "",
      // The currently pending/unprocessed upload only — never a past
      // (already collected) screenshot. Once Collect archives it into
      // history, the backend clears this field, so it disappears here too.
      paymentProofImage: student.paymentProofImage || "",
    };
  };

  const paymentRows = useMemo(
    () => students.map((student) => buildPaymentRow(student, paymentRecords)),
    [students, paymentRecords],
  );

  const courseOptions = useMemo(
    () =>
      [...new Set(paymentRows.map((payment) => payment.course))].filter(
        (course) => course && course !== "-",
      ),
    [paymentRows],
  );

  const batchOptions = useMemo(
    () =>
      [...new Set(paymentRows.map((payment) => payment.batch))].filter(
        (batch) => batch && batch !== "-",
      ),
    [paymentRows],
  );

  const activeFilterCount = [
    courseFilter !== "all",
    statusFilter !== "all",
    methodFilter !== "all",
    batchFilter !== "all",
    screenshotFilter !== "all",
  ].filter(Boolean).length;

  const filteredPayments = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    const phoneKeyword = search.replace(/\s/g, "");

    return paymentRows
      .filter((payment) => {
        const matchesSearch =
          !keyword ||
          payment.studentName.toLowerCase().includes(keyword) ||
          payment.rollNo.toLowerCase().includes(keyword) ||
          payment.course.toLowerCase().includes(keyword) ||
          payment.batch.toLowerCase().includes(keyword) ||
          payment.phone.replace(/\s/g, "").includes(phoneKeyword);

        const matchesStatus =
          statusFilter === "all" ||
          (statusFilter === "no-fee"
            ? !payment.hasFeeCycle
            : payment.paymentStatus === statusFilter);

        const matchesMethod =
          methodFilter === "all" || payment.paymentMethod === methodFilter;

        const matchesCourse =
          courseFilter === "all" || payment.course === courseFilter;

        const matchesBatch =
          batchFilter === "all" || payment.batch === batchFilter;

        // Same source of truth as the red notification dot: a non-empty
        // paymentProofImage means the screenshot is uploaded and still
        // unprocessed (backend clears it the moment Admin collects the
        // payment or a new fee cycle is generated).
        const matchesScreenshot =
          screenshotFilter === "all" ||
          (screenshotFilter === "new" && Boolean(payment.paymentProofImage));

        return (
          matchesSearch &&
          matchesCourse &&
          matchesStatus &&
          matchesMethod &&
          matchesBatch &&
          matchesScreenshot
        );
      })
      .sort((firstPayment, secondPayment) =>
        String(firstPayment.rollNo || "").localeCompare(
          String(secondPayment.rollNo || ""),
          undefined,
          {
            numeric: true,
            sensitivity: "base",
          },
        ),
      );
  }, [
    paymentRows,
    search,
    methodFilter,
    courseFilter,
    statusFilter,
    batchFilter,
    screenshotFilter,
  ]);

  const summary = useMemo(() => {
    return paymentRows.reduce(
      (result, payment) => {
        result.totalStudents += 1;

        if (payment.paymentStatus === "paid") {
          result.paidStudents += 1;
        }

        result.totalCollected += payment.paidAmount;

        if (payment.paidAmount > 0) {
          if (payment.paymentMethod === "cash") {
            result.cashPayments += 1;
          } else if (payment.paymentMethod) {
            result.onlinePayments += 1;
          }
        }

        return result;
      },
      {
        totalStudents: 0,
        paidStudents: 0,
        totalCollected: 0,
        cashPayments: 0,
        onlinePayments: 0,
      },
    );
  }, [paymentRows]);

  const handleSaveDueDate = async () => {
    if (!selectedDueDate) {
      toast.error("Please select a fee due date");
      return;
    }

    try {
      setIsSavingDueDate(true);

      const response = await api.put("/payments/due-date", {
        feeDueDate: selectedDueDate,
      });

      setFeeDueDate(selectedDueDate);

      await fetchPaymentPageData();

      if (response.data?.studentsReset) {
        toast.success(
          response.data?.message ||
            "New month started. All students reset to unpaid.",
        );
      } else {
        toast.success(
          response.data?.message || "Fee due date updated successfully",
        );
      }
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to update fee due date",
      );
    } finally {
      setIsSavingDueDate(false);
    }
  };
  const handlePaymentSettingChange = (event) => {
    const { name, value } = event.target;

    setPaymentSettings((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleQrUpload = (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid QR image");
      event.target.value = "";
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      const image = new Image();

      image.onload = () => {
        const maxSize = 320;
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");

        canvas.width = maxSize;
        canvas.height = maxSize;

        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, maxSize, maxSize);

        const scale = Math.min(maxSize / image.width, maxSize / image.height);

        const drawWidth = image.width * scale;
        const drawHeight = image.height * scale;
        const x = (maxSize - drawWidth) / 2;
        const y = (maxSize - drawHeight) / 2;

        context.drawImage(image, x, y, drawWidth, drawHeight);

        const compressedQr = canvas.toDataURL("image/jpeg", 0.82);

        setPaymentSettings((current) => ({
          ...current,
          upiQrImage: compressedQr,
        }));

        toast.success("QR image selected");
      };

      image.onerror = () => {
        toast.error("Unable to read the QR image");
      };

      image.src = String(reader.result || "");
    };

    reader.readAsDataURL(file);
    event.target.value = "";
  };

  const handleRemoveQr = () => {
    setPaymentSettings((current) => ({
      ...current,
      upiQrImage: "",
    }));
  };

  const handleSavePaymentSettings = async () => {
    const upiId = paymentSettings.upiId.trim();
    const receiverName = paymentSettings.receiverName.trim();
    const paymentPhone = paymentSettings.paymentPhone
      .replace(/\s+/g, "")
      .trim();

    if (!upiId) {
      toast.error("Please enter the UPI ID");
      return;
    }

    if (!receiverName) {
      toast.error("Please enter the receiver name");
      return;
    }

    if (!paymentPhone) {
      toast.error("Please enter the payment phone number");
      return;
    }

    try {
      setIsSavingPaymentSettings(true);

      const response = await api.put("/payments/settings", {
        upiId,
        receiverName,
        paymentPhone,
        upiQrImage: paymentSettings.upiQrImage || "",
      });

      setPaymentSettings({
        upiId: response.data?.paymentSettings?.upiId || upiId,
        receiverName:
          response.data?.paymentSettings?.receiverName || receiverName,
        paymentPhone:
          response.data?.paymentSettings?.paymentPhone || paymentPhone,
        upiQrImage:
          response.data?.paymentSettings?.upiQrImage ??
          paymentSettings.upiQrImage,
      });

      toast.success(
        response.data?.message || "UPI settings updated successfully",
      );

      setShowPaymentSettings(false);
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to update UPI settings",
      );
    } finally {
      setIsSavingPaymentSettings(false);
    }
  };

  const handleSendReminders = async (studentIds, messageType) => {
    if (isSendingReminders) {
      return;
    }

    if (Array.isArray(studentIds) && studentIds.length === 0) {
      toast.error("Please select at least one student");
      return;
    }

    try {
      setIsSendingReminders(true);

      const response = await api.post("/payments/send-reminders", {
        studentIds: Array.isArray(studentIds) ? studentIds : undefined,
        messageType,
      });

      const result = response.data || {};
      const sent = Number(result.sent || 0);
      const failed = Number(result.failed || 0);
      const totalEligible = Number(result.totalEligible || 0);

      if (sent > 0 && failed === 0) {
        toast.success(
          `${sent} fee reminder${sent > 1 ? "s" : ""} sent successfully`,
        );
      } else if (sent > 0 && failed > 0) {
        toast(`${sent} sent successfully, ${failed} failed`, {
          icon: "⚠️",
        });
      } else if (totalEligible === 0) {
        toast(result.message || "No unpaid students found for reminder", {
          icon: "ℹ️",
        });
      } else if (failed > 0) {
        toast.error(
          `Failed to send ${failed} fee reminder${failed > 1 ? "s" : ""}`,
        );
      } else {
        toast(result.message || "No fee reminders were sent", {
          icon: "ℹ️",
        });
      }
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to send fee reminders",
      );
    } finally {
      setIsSendingReminders(false);
      setShowReminderMenu(false);
      setShowIndividualPicker(false);
      setShowMessageTypePicker(false);
      setSelectedReminderIds([]);
    }
  };

  const openMessageTypePicker = (type, studentIds = []) => {
    setShowReminderMenu(false);
    setShowIndividualPicker(false);
    setNotificationTarget({ type, studentIds });
    setShowMessageTypePicker(true);
  };

  const chooseMessageType = (messageType) => {
    handleSendReminders(
      notificationTarget.type === "all-unpaid"
        ? undefined
        : notificationTarget.studentIds,
      messageType,
    );
  };

  const toggleStudentNotificationMenu = (event, student) => {
    event.preventDefault();
    event.stopPropagation();

    if (studentNotificationMenu === student._id) {
      setStudentNotificationMenu(null);
      setStudentNotificationAnchor(null);
      return;
    }

    const buttonBounds = event.currentTarget.getBoundingClientRect();

    // Two menu items plus padding — roughly its real rendered height.
    // For a row near the bottom of the viewport (e.g. the last row of the
    // table), opening downward from here would push the menu mostly or
    // entirely below the visible window. Flip it to open upward instead
    // whenever there isn't enough room below.
    const estimatedMenuHeight = 100;
    const spaceBelow = window.innerHeight - buttonBounds.bottom;
    const openUpward = spaceBelow < estimatedMenuHeight + 8;

    setStudentNotificationAnchor({
      right: Math.max(8, window.innerWidth - buttonBounds.right),
      ...(openUpward
        ? { bottom: Math.max(8, window.innerHeight - buttonBounds.top + 8) }
        : { top: buttonBounds.bottom + 8 }),
    });
    setStudentNotificationMenu(student._id);
  };

  const sendIndividualReminder = (messageType) => {
    const student = filteredPayments.find(
      (payment) => payment._id === studentNotificationMenu,
    );

    setStudentNotificationMenu(null);
    setStudentNotificationAnchor(null);

    if (student) {
      handleSendReminders([student._id], messageType);
    }
  };

  const openIndividualPicker = () => {
    setShowReminderMenu(false);
    setSelectedReminderIds([]);
    setReminderSearch("");
    setShowIndividualPicker(true);
  };

  const toggleReminderStudent = (studentId) => {
    setSelectedReminderIds((current) =>
      current.includes(studentId)
        ? current.filter((id) => id !== studentId)
        : [...current, studentId],
    );
  };

  const toggleAllReminderStudents = () => {
    const unpaidStudentIds = paymentRows
      .filter((student) => student.paymentStatus === "unpaid")
      .map((student) => student._id);

    setSelectedReminderIds((current) =>
      current.length === unpaidStudentIds.length ? [] : unpaidStudentIds,
    );
  };

  const formatMoney = (value) => Number(value || 0).toLocaleString("en-IN");

  const formatDate = (value) => {
    if (!value) return "-";

    return new Date(value).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatPaymentMethod = (method) => {
    const methods = {
      cash: "Cash",
      bank: "Bank",
      upi: "UPI",
      qr: "QR",
    };

    return methods[method] || "-";
  };

  // A student's fee can be edited from the Students page — a different
  // mounted component with its own copy of this data — so the row clicked
  // here can be stale (e.g. a fully-paid student whose fee was just raised
  // to open a second round of collection). Show what's on hand immediately,
  // then silently re-pull this one student + the payment log before
  // allowing a collection, so "still shows paid" can't happen at the one
  // moment it actually matters.
  const openCollectModal = async (payment) => {
    setCollectModalStudent(payment);
    setCollectAmountInput("");
    setCollectMethodInput("");
    setShowCollectHistory(false);

    try {
      setIsRefreshingCollectModal(true);

      const fresh = await fetchPaymentPageData(true);

      const freshStudent = fresh?.students.find(
        (student) => String(student._id) === String(payment._id),
      );

      if (freshStudent) {
        setCollectModalStudent(
          buildPaymentRow(freshStudent, fresh.paymentRecords),
        );
      }
    } finally {
      setIsRefreshingCollectModal(false);
    }
  };

  const closeCollectModal = () => {
    if (isCollectingPayment) return;

    setCollectModalStudent(null);
    setCollectAmountInput("");
    setCollectMethodInput("");
    setShowCollectHistory(false);
    setHistoryFeeCycles([]);
    setViewingHistoryRecord(null);
  };

  // Fetched fresh from the backend (grouped by fee cycle there) rather than
  // derived from the flat /payments list, so each record's amount and
  // screenshot can never be mismatched on the frontend — flattened below
  // only for display, into one simple, compact list.
  const toggleCollectHistory = async () => {
    if (showCollectHistory) {
      setShowCollectHistory(false);
      setViewingHistoryRecord(null);
      return;
    }

    // Defense in depth — the History button itself is only rendered when
    // canViewPaymentDetails is true, but the real access control lives on
    // the backend (GET /students/:id/fee-cycles now requires the same
    // 'viewDetails' permission), not here.
    if (!canViewPaymentDetails) return;

    setShowCollectHistory(true);

    if (!collectModalStudent) return;

    try {
      setIsLoadingHistory(true);

      const response = await api.get(
        `/students/${collectModalStudent._id}/fee-cycles`,
      );

      setHistoryFeeCycles(response.data || []);
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          "Failed to load fee collection history",
      );
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Same modal serves two actions on the same fee-cycle concept: editing
  // the CURRENT cycle's amount while it's still unpaid/partial, versus
  // generating a brand new cycle (only possible once the old one is fully
  // paid, or there's no cycle yet). isEditingActiveFee below is what tells
  // the modal and its submit handler which of the two this is.
  const openGenerateFeeModal = (payment) => {
    setGenerateFeeStudent(payment);

    const isEditingActiveFee =
      payment.hasFeeCycle && payment.paymentStatus !== "paid";

    setGenerateFeeAmountInput(
      isEditingActiveFee && canViewTotalFeeColumn && payment.totalFee
        ? String(payment.totalFee)
        : "",
    );
  };

  const closeGenerateFeeModal = () => {
    if (isGeneratingFee) return;

    setGenerateFeeStudent(null);
    setGenerateFeeAmountInput("");
  };

  const handleGenerateFee = async () => {
    if (!generateFeeStudent) return;

    const amount = Number(generateFeeAmountInput);

    if (!amount || amount <= 0) {
      toast.error("Enter a valid fee amount");
      return;
    }

    const isEditingActiveFee =
      generateFeeStudent.hasFeeCycle &&
      generateFeeStudent.paymentStatus !== "paid";

    try {
      setIsGeneratingFee(true);

      if (isEditingActiveFee) {
        await api.patch(
          `/students/${generateFeeStudent._id}/fee-cycles/active`,
          { totalFee: amount },
        );

        toast.success(
          `Fee updated to ₹${formatMoney(amount)} for ${
            generateFeeStudent.studentName
          }`,
        );
      } else {
        await api.post(
          `/students/${generateFeeStudent._id}/fee-cycles`,
          { totalFee: amount },
        );

        toast.success(
          `New fee cycle of ₹${formatMoney(amount)} generated for ${
            generateFeeStudent.studentName
          }`,
        );
      }

      setGenerateFeeStudent(null);
      setGenerateFeeAmountInput("");

      await fetchPaymentPageData();
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          (isEditingActiveFee
            ? "Failed to update the fee amount"
            : "Failed to generate the new fee cycle"),
      );
    } finally {
      setIsGeneratingFee(false);
    }
  };

  const handleCollectPayment = async () => {
    if (!collectModalStudent) return;

    if (isRefreshingCollectModal) {
      toast.error("Still refreshing this student's fee status, please wait");
      return;
    }

    const amount = Number(collectAmountInput);

    if (!amount || amount <= 0) {
      toast.error("Enter a valid amount received");
      return;
    }

    if (!collectMethodInput) {
      toast.error("Select a payment method");
      return;
    }

    // Checked up front only when this trainer's copy of the record
    // actually has a real pending balance in it (students.feeInfo
    // permission) — otherwise it's 0 either way and the backend still
    // enforces the real limit, returning a balance-free error message.
    if (canSeeStudentFeeNumbers) {
      const pending = Number(collectModalStudent.pendingAmount || 0);

      if (amount > pending) {
        toast.error(
          `Amount exceeds the pending balance of ₹${formatMoney(pending)}`,
        );
        return;
      }
    }

    try {
      setIsCollectingPayment(true);

      const response = await api.patch(
        `/students/${collectModalStudent._id}/collect-payment`,
        { amount, paymentMethod: collectMethodInput },
      );

      const updatedStatus = response.data?.paymentStatus;

      toast.success(
        updatedStatus === "paid"
          ? `${collectModalStudent.studentName}'s payment is now fully collected`
          : `₹${formatMoney(amount)} collected from ${collectModalStudent.studentName}`,
      );

      setCollectModalStudent(null);
      setCollectAmountInput("");
      setCollectMethodInput("");

      await fetchPaymentPageData();
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to collect payment",
      );
    } finally {
      setIsCollectingPayment(false);
    }
  };

  const openHistoryDeleteConfirm = (record) => {
    setHistoryDeleteTarget(record);
  };

  const closeHistoryDeleteConfirm = () => {
    if (isDeletingHistory) return;

    setHistoryDeleteTarget(null);
  };

  const handleConfirmDeleteHistory = async () => {
    if (!historyDeleteTarget) return;

    try {
      setIsDeletingHistory(true);

      await api.delete(`/payments/${historyDeleteTarget._id}`);

      toast.success("Payment history record deleted");

      setHistoryDeleteTarget(null);

      // Only the history log changes here — the student's fee balance is
      // untouched, so no need to re-check pending amounts, just refresh
      // the underlying records this page derives everything from.
      await fetchPaymentPageData();

      setHistoryFeeCycles((current) =>
        current.map((feeCycle) => ({
          ...feeCycle,
          payments: feeCycle.payments.filter(
            (record) => record._id !== historyDeleteTarget._id,
          ),
        })),
      );

      setViewingHistoryRecord((current) =>
        current?._id === historyDeleteTarget._id ? null : current,
      );
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          "Failed to delete payment history record",
      );
    } finally {
      setIsDeletingHistory(false);
    }
  };

  const isDueDateReached = useMemo(() => {
    if (!feeDueDate) return false;

    const now = new Date();

    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [year, month, day] = feeDueDate.split("-").map(Number);

    const dueDate = new Date(year, month - 1, day);

    return today >= dueDate;
  }, [feeDueDate]);

  return (
    <div className="payments-page">
      <div
        className={`payments-top-grid ${
          !canViewSummary ? "trainer-summary-grid" : ""
        }`}
      >
        {canViewSummary && (
          <div className="payment-summary-card">
            <div className="payment-summary-icon">
              <FiDollarSign />
            </div>

            <div>
              <span>Total Collected</span>
              <strong>₹{formatMoney(summary.totalCollected)}</strong>
              <small>Successfully collected fees</small>
            </div>
          </div>
        )}

        <div className="payment-summary-card cash-card">
          <div className="payment-summary-icon">
            <FiCreditCard />
          </div>

          <div>
            <span>Cash Payments</span>
            <strong>{summary.cashPayments}</strong>
            <small>Offline transactions</small>
          </div>
        </div>

        <div className="payment-summary-card online-card">
          <div className="payment-summary-icon">
            <FiCheckCircle />
          </div>

          <div>
            <span>Online Payments</span>
            <strong>{summary.onlinePayments}</strong>
            <small>Bank / UPI / QR</small>
          </div>
        </div>

        <div className="payment-summary-card due-date-card">
          <div className="payment-summary-icon">
            <FiCalendar />
          </div>

          <div className="common-fee-date-content">
            <div className="common-fee-date-heading">
              <span>Common Fees Date</span>

              {feeDueDate && (
                <small
                  className={
                    isDueDateReached
                      ? "due-date-state expired"
                      : "due-date-state active"
                  }
                >
                  <FiClock />
                  {isDueDateReached ? "Due" : "Active"}
                </small>
              )}
            </div>

            <strong>{feeDueDate ? formatDate(feeDueDate) : "Not Set"}</strong>

            <small>Monthly common fee due date</small>
          </div>
        </div>
      </div>

      <section className="payment-history-section">
        <div className="payment-toolbar">
          <div className="payment-search">
            <FiSearch />

            <input
              type="text"
              placeholder="Search student, roll no, phone, course or batch..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          <div className="payment-filter-wrapper">
            <button
              type="button"
              className={`payment-filter-button ${showFilters ? "active" : ""}`}
              onClick={() => setShowFilters((current) => !current)}
            >
              <FiFilter />
              <span>Filter</span>

              {activeFilterCount > 0 && (
                <span className="payment-filter-count">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {showFilters && (
              <div className="payment-filter-dropdown">
                <div className="payment-filter-header">
                  <strong>Filter Payments</strong>

                  <div className="payment-filter-header-actions">
                    {activeFilterCount > 0 && (
                      <button
                        type="button"
                        className="payment-filter-clear-btn"
                        onClick={() => {
                          setCourseFilter("all");
                          setStatusFilter("all");
                          setMethodFilter("all");
                          setBatchFilter("all");
                          setScreenshotFilter("all");
                        }}
                      >
                        Clear
                      </button>
                    )}

                    <button
                      type="button"
                      className="payment-filter-close-btn"
                      onClick={() => setShowFilters(false)}
                      aria-label="Close filters"
                      title="Close filters"
                    >
                      <FiX />
                    </button>
                  </div>
                </div>

                <div className="payment-filter-field">
                  <label>Course</label>

                  <select
                    value={courseFilter}
                    onChange={(event) => setCourseFilter(event.target.value)}
                  >
                    <option value="all">All Courses</option>

                    {courseOptions.map((course) => (
                      <option key={course} value={course}>
                        {course}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="payment-filter-field">
                  <label>Payment Status</label>

                  <select
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value)}
                  >
                    <option value="all">All Status</option>
                    <option value="paid">Paid</option>
                    <option value="partial">Partial</option>
                    <option value="unpaid">Unpaid</option>
                    <option value="no-fee">No Fee Generated</option>
                  </select>
                </div>

                <div className="payment-filter-field">
                  <label>Payment Method</label>

                  <select
                    value={methodFilter}
                    onChange={(event) => setMethodFilter(event.target.value)}
                  >
                    <option value="all">All Methods</option>
                    <option value="cash">Cash</option>
                    <option value="bank">Bank</option>
                    <option value="upi">UPI</option>
                    <option value="qr">QR</option>
                  </select>
                </div>

                <div className="payment-filter-field">
                  <label>Batch</label>

                  <select
                    value={batchFilter}
                    onChange={(event) => setBatchFilter(event.target.value)}
                  >
                    <option value="all">All Batches</option>

                    {batchOptions.map((batch) => (
                      <option key={batch} value={batch}>
                        {batch}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="payment-filter-field">
                  <label>Screenshot</label>

                  <select
                    value={screenshotFilter}
                    onChange={(event) =>
                      setScreenshotFilter(event.target.value)
                    }
                  >
                    <option value="all">All</option>
                    <option value="new">New Screenshot</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          <div className="payment-reminder-wrapper">
            <button
              type="button"
              className="send-fee-reminder-btn payment-toolbar-reminder-btn"
              onClick={() => setShowReminderMenu((open) => !open)}
              disabled={isSendingReminders}
              title="Choose students and notification type"
            >
              <FiBell />
              <span>{isSendingReminders ? "Sending..." : "Send Reminder"}</span>
            </button>
          </div>

          {showReminderMenu && (
            <div
              className="notification-options-overlay"
              onClick={() => setShowReminderMenu(false)}
            >
              <section
                className="notification-options-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="reminder-options-title"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="notification-options-header">
                  <div>
                    <span>FEE REMINDERS</span>
                    <h2 id="reminder-options-title">Choose recipients</h2>
                    <p>Send a WhatsApp fee reminder to unpaid students.</p>
                  </div>
                  <button
                    type="button"
                    className="notification-options-close"
                    aria-label="Close reminder options"
                    onClick={() => setShowReminderMenu(false)}
                  >
                    <FiX />
                  </button>
                </div>

                <div className="notification-options-body">
                  <button
                    type="button"
                    className="notification-mode-card"
                    disabled={isSendingReminders}
                    onClick={() => openMessageTypePicker("all-unpaid")}
                  >
                    <span className="notification-mode-icon">
                      <FiUsers />
                    </span>
                    <span>
                      <strong>Send to all unpaid students</strong>
                      <span>
                        Every student with an outstanding fee will receive a
                        reminder.
                      </span>
                    </span>
                  </button>

                  <button
                    type="button"
                    className="notification-mode-card"
                    disabled={isSendingReminders}
                    onClick={openIndividualPicker}
                  >
                    <span className="notification-mode-icon">
                      <FiUser />
                    </span>
                    <span>
                      <strong>Select individual students</strong>
                      <span>
                        Choose one or more unpaid students before sending.
                      </span>
                    </span>
                  </button>
                </div>
              </section>
            </div>
          )}

          {showIndividualPicker && (
            <div
              className="notification-options-overlay"
              onClick={() => setShowIndividualPicker(false)}
            >
              <section
                className="notification-options-modal notification-recipient-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="reminder-recipients-title"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="notification-options-header">
                  <div>
                    <span>FEE REMINDERS</span>
                    <h2 id="reminder-recipients-title">Select students</h2>
                    <p>Only students with unpaid fees are shown below.</p>
                  </div>
                  <button
                    type="button"
                    className="notification-options-close"
                    aria-label="Close student selection"
                    onClick={() => setShowIndividualPicker(false)}
                  >
                    <FiX />
                  </button>
                </div>

                <div className="notification-recipient-body">
                  <div className="notification-recipient-toolbar">
                    <FiSearch />
                    <input
                      type="search"
                      value={reminderSearch}
                      onChange={(event) =>
                        setReminderSearch(event.target.value)
                      }
                      placeholder="Search by student name or roll number"
                    />
                  </div>

                  <div className="notification-selection-summary">
                    <p className="notification-selection-count">
                      <FiCheck /> {selectedReminderIds.length} student
                      {selectedReminderIds.length === 1 ? "" : "s"} selected
                    </p>
                    <button
                      type="button"
                      className="notification-select-all-btn"
                      onClick={toggleAllReminderStudents}
                    >
                      {selectedReminderIds.length ===
                      paymentRows.filter(
                        (student) => student.paymentStatus === "unpaid",
                      ).length
                        ? "Clear selection"
                        : "Select all"}
                    </button>
                  </div>

                  <div className="payment-reminder-picker-list">
                    {paymentRows
                      .filter((student) => student.paymentStatus === "unpaid")
                      .filter((student) => {
                        const query = reminderSearch.trim().toLowerCase();
                        return (
                          !query ||
                          student.studentName?.toLowerCase().includes(query) ||
                          student.rollNo?.toLowerCase().includes(query)
                        );
                      })
                      .map((student) => (
                        <label
                          key={student._id}
                          className="payment-reminder-picker-item"
                        >
                          <input
                            type="checkbox"
                            checked={selectedReminderIds.includes(student._id)}
                            onChange={() => toggleReminderStudent(student._id)}
                          />
                          <span className="payment-reminder-student-details">
                            <strong>{student.studentName}</strong>
                            <small>
                              {student.rollNo} · {student.course}
                            </small>
                          </span>
                        </label>
                      ))}

                    {paymentRows.filter(
                      (student) => student.paymentStatus === "unpaid",
                    ).length === 0 && <p>No unpaid students found</p>}
                  </div>
                </div>

                <div className="notification-options-footer">
                  <button
                    type="button"
                    className="notification-cancel-btn"
                    onClick={() => setShowIndividualPicker(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="notification-send-btn"
                    disabled={
                      isSendingReminders || selectedReminderIds.length === 0
                    }
                    onClick={() =>
                      openMessageTypePicker("selected", selectedReminderIds)
                    }
                  >
                    {isSendingReminders
                      ? "Sending..."
                      : `Send to Selected (${selectedReminderIds.length})`}
                  </button>
                </div>
              </section>
            </div>
          )}

          {showMessageTypePicker && (
            <div
              className="notification-options-overlay"
              onClick={() => setShowMessageTypePicker(false)}
            >
              <section
                className="notification-options-modal notification-message-type-modal"
                role="dialog"
                aria-modal="true"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="notification-options-header">
                  <div>
                    <span>NOTIFICATION TYPE</span>
                    <h2>Choose message</h2>
                    <p>Select the message to send to the chosen students.</p>
                  </div>
                  <button
                    type="button"
                    className="notification-options-close"
                    onClick={() => setShowMessageTypePicker(false)}
                  >
                    <FiX />
                  </button>
                </div>
                <div className="notification-options-body notification-message-type-list">
                  <button
                    type="button"
                    className="notification-mode-card"
                    onClick={() => chooseMessageType("prevent")}
                  >
                    <span className="notification-mode-icon">
                      <FiCalendar />
                    </span>
                    <span>
                      <strong>Prevent message</strong>
                      <span>Payment due date is approaching.</span>
                    </span>
                  </button>
                  <button
                    type="button"
                    className="notification-mode-card"
                    onClick={() => chooseMessageType("overdue")}
                  >
                    <span className="notification-mode-icon">
                      <FiBell />
                    </span>
                    <span>
                      <strong>Overdue message</strong>
                      <span>Fee is still pending after the due date.</span>
                    </span>
                  </button>
                </div>
              </section>
            </div>
          )}
        </div>

        <div className="payment-table-card">
          {isLoading ? (
            <div className="payment-message">
              <div className="payment-loader" />
              <span>Loading students...</span>
            </div>
          ) : filteredPayments.length === 0 ? (
            <div className="payment-message">
              <FiCreditCard />
              {screenshotFilter === "new" ? (
                <>
                  <strong>No new payment screenshots</strong>
                  <span>All uploaded screenshots have been processed</span>
                </>
              ) : (
                <>
                  <strong>No students found</strong>
                  <span>Try changing your search or filter</span>
                </>
              )}
            </div>
          ) : (
            <div className="payment-table-wrapper">
              <table className="payments-table">
                <thead>
                  <tr>
                    <th>S.No</th>
                    <th>Student</th>
                    <th>Roll No</th>
                    <th>Course</th>
                    {canViewPhoneColumn && <th>Phone</th>}
                    {canViewProofColumn && <th>Proof</th>}
                    {canViewTotalFeeColumn && <th>Total Fee</th>}
                    {canViewStatusColumn && <th>Status</th>}
                    <th>Payment Date</th>
                    <th>Method</th>
                    <th>Notify</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredPayments.map((payment, index) => (
                    <tr
                      key={payment._id}
                      className={[
                        "payment-row",
                        canViewPaymentDetails && "payment-row-clickable",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      onClick={
                        canViewPaymentDetails
                          ? () => setSelectedPayment(payment)
                          : undefined
                      }
                    >
                      <td>{index + 1}</td>

                      <td>
                        <div className="payment-student">
                          <div className="payment-avatar">
                            {payment.studentName?.charAt(0)?.toUpperCase() ||
                              "S"}
                          </div>

                          <div>
                            <strong>{payment.studentName}</strong>
                            <span>Fee Payment</span>
                          </div>
                        </div>
                      </td>

                      <td>{payment.rollNo}</td>

                      <td>
                        <span className="payment-course">{payment.course}</span>
                      </td>

                      {canViewPhoneColumn && <td>{payment.phone}</td>}

                      {canViewProofColumn && (
                      <td className="payment-proof-cell">
                        {!canCollectPayment ? (
                          payment.paymentProofImage ? (
                            <button
                              type="button"
                              className="payment-proof-icon-btn"
                              title="View payment proof"
                              onClick={(event) => {
                                event.stopPropagation();
                                openCollectModal(payment);
                              }}
                            >
                              <FiImage />

                              {canSeeProofNotification && (
                                <span
                                  className="payment-proof-notification-dot"
                                  title="New payment screenshot waiting to be processed"
                                />
                              )}
                            </button>
                          ) : (
                            <span className="payment-proof-empty">-</span>
                          )
                        ) : payment.paymentProofImage ? (
                          <button
                            type="button"
                            className="payment-proof-icon-btn"
                            title="View payment proof & collect payment"
                            onClick={(event) => {
                              event.stopPropagation();
                              openCollectModal(payment);
                            }}
                          >
                            <FiImage />

                            {canSeeProofNotification && (
                              <span
                                className="payment-proof-notification-dot"
                                title="New payment screenshot waiting to be processed"
                              />
                            )}
                          </button>
                        ) : payment.hasFeeCycle ? (
                          // Not gated on payment.paymentStatus — that status
                          // can be stale here (e.g. this student's fee was
                          // just raised elsewhere after being fully paid).
                          // Always give an authorized user a way in;
                          // openCollectModal re-pulls this student fresh
                          // before the popup shows anything, so "still
                          // shows paid" can't block a real collection.
                          <button
                            type="button"
                            className="payment-proof-icon-btn payment-proof-icon-btn-empty"
                            title="Collect payment"
                            onClick={(event) => {
                              event.stopPropagation();
                              openCollectModal(payment);
                            }}
                          >
                            <FiCreditCard />
                          </button>
                        ) : (
                          // No fee cycle at all — nothing to collect
                          // against yet. Use the "+" in the Status column
                          // to generate one first.
                          <span className="payment-proof-empty">-</span>
                        )}
                      </td>
                      )}

                      {canViewTotalFeeColumn && (
                      <td>
                        <strong className="payment-amount">
                          {payment.hasFeeCycle
                            ? `₹${formatMoney(payment.totalFee)}`
                            : "-"}
                        </strong>
                      </td>
                      )}

                      {canViewStatusColumn && (
                      <td className="payment-status-td">
                        {!payment.hasFeeCycle ? (
                          canEditFee ? (
                            <button
                              type="button"
                              className="payment-status-generate-btn"
                              title="Generate fee"
                              onClick={(event) => {
                                event.stopPropagation();
                                openGenerateFeeModal(payment);
                              }}
                            >
                              <FiPlus />
                            </button>
                          ) : (
                            <span className="payment-status-badge is-no-fee">
                              No Fee
                            </span>
                          )
                        ) : (
                          <span className="payment-status-cell">
                            <span
                              className={`payment-status-badge ${
                                payment.paymentStatus === "paid"
                                  ? "is-paid"
                                  : payment.paymentStatus === "partial"
                                    ? "is-partial"
                                    : "is-unpaid"
                              }`}
                            >
                              {payment.paymentStatus === "paid"
                                ? "Paid"
                                : payment.paymentStatus === "partial"
                                  ? "Partial"
                                  : "Unpaid"}
                            </span>

                            {payment.paymentStatus === "paid" &&
                              canEditFee && (
                                <button
                                  type="button"
                                  className="payment-status-generate-btn payment-status-generate-btn-inline"
                                  title="Generate next fee cycle"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    openGenerateFeeModal(payment);
                                  }}
                                >
                                  <FiPlus />
                                </button>
                              )}

                            {(payment.paymentStatus === "unpaid" ||
                              payment.paymentStatus === "partial") &&
                              canEditFee && (
                                <button
                                  type="button"
                                  className="payment-status-generate-btn payment-status-generate-btn-inline"
                                  title="Edit fee amount"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    openGenerateFeeModal(payment);
                                  }}
                                >
                                  <FiEdit2 />
                                </button>
                              )}
                          </span>
                        )}
                      </td>
                      )}

                      <td>{formatDate(payment.paymentDate)}</td>

                      <td>
                        <span className="payment-method">
                          {formatPaymentMethod(payment.paymentMethod)}
                        </span>
                      </td>

                      <td>
                        <div
                          className="student-notification-dropdown"
                          ref={
                            studentNotificationMenu === payment._id
                              ? studentNotificationMenuRef
                              : null
                          }
                        >
                          <button
                            type="button"
                            className="student-notify-btn"
                            aria-label={`Send notification to ${payment.studentName}`}
                            aria-expanded={
                              studentNotificationMenu === payment._id
                            }
                            onClick={(event) =>
                              toggleStudentNotificationMenu(event, payment)
                            }
                          >
                            <FiBell />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {studentNotificationMenu && studentNotificationAnchor && (
        <div
          ref={studentNotificationFloatingMenuRef}
          className="student-notify-menu student-notify-menu-floating"
          role="menu"
          style={{
            // Both explicitly set (never left to fall through to the base
            // .student-notify-menu class's own `top: calc(100% + 7px)`,
            // which — since it's not !important — would otherwise still
            // apply here whenever this inline style skips `top`).
            top: studentNotificationAnchor.top ?? "auto",
            bottom: studentNotificationAnchor.bottom ?? "auto",
            right: studentNotificationAnchor.right,
          }}
        >
          <button
            type="button"
            role="menuitem"
            disabled={isSendingReminders}
            onClick={() => sendIndividualReminder("prevent")}
          >
            Prevent Reminder
          </button>
          <button
            type="button"
            role="menuitem"
            disabled={isSendingReminders}
            onClick={() => sendIndividualReminder("overdue")}
          >
            Overdue Reminder
          </button>
        </div>
      )}

      {showPaymentSettings && (
        <div
          className="payment-settings-overlay"
          onClick={() => {
            if (!isSavingPaymentSettings) {
              setShowPaymentSettings(false);
            }
          }}
        >
          <div
            className="payment-settings-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="payment-settings-header">
              <div>
                <span>ONLINE PAYMENT</span>
                <h2>UPI Settings</h2>
                <p>
                  Update the account details used to receive student fee
                  payments.
                </p>
              </div>

              <button
                type="button"
                className="payment-settings-close"
                onClick={() => setShowPaymentSettings(false)}
                disabled={isSavingPaymentSettings}
                aria-label="Close UPI settings"
                title="Close"
              >
                <FiX />
              </button>
            </div>

            <div className="payment-settings-body">
              <div className="payment-settings-field">
                <label htmlFor="payment-upi-id">UPI ID</label>

                <input
                  id="payment-upi-id"
                  type="text"
                  name="upiId"
                  value={paymentSettings.upiId}
                  onChange={handlePaymentSettingChange}
                  placeholder="example@upi"
                  autoComplete="off"
                />
              </div>

              <div className="payment-settings-field">
                <label htmlFor="payment-receiver-name">Receiver Name</label>

                <input
                  id="payment-receiver-name"
                  type="text"
                  name="receiverName"
                  value={paymentSettings.receiverName}
                  onChange={handlePaymentSettingChange}
                  placeholder="The SK Learnings"
                  autoComplete="off"
                />
              </div>

              <div className="payment-settings-field">
                <label htmlFor="payment-phone">Payment Phone Number</label>

                <input
                  id="payment-phone"
                  type="tel"
                  name="paymentPhone"
                  value={paymentSettings.paymentPhone}
                  onChange={handlePaymentSettingChange}
                  placeholder="10 digit mobile number"
                  maxLength={10}
                  inputMode="numeric"
                  autoComplete="tel"
                />
              </div>

              <div className="payment-settings-qr-section">
                <div className="payment-settings-qr-heading">
                  <div>
                    <label>Payment QR Code</label>
                    <span>
                      Upload the QR that students can scan on the payment page.
                    </span>
                  </div>

                  <FiImage />
                </div>

                <div className="payment-settings-qr-content">
                  <div className="payment-settings-qr-preview">
                    {paymentSettings.upiQrImage ? (
                      <img
                        src={paymentSettings.upiQrImage}
                        alt="Payment QR preview"
                      />
                    ) : (
                      <div className="payment-settings-qr-empty">
                        <FiImage />
                        <span>No QR uploaded</span>
                      </div>
                    )}
                  </div>

                  <div className="payment-settings-qr-actions">
                    <label
                      className="payment-settings-upload-btn"
                      htmlFor="payment-qr-upload"
                    >
                      <FiUpload />
                      <span>
                        {paymentSettings.upiQrImage ? "Change QR" : "Upload QR"}
                      </span>
                    </label>

                    <input
                      id="payment-qr-upload"
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={handleQrUpload}
                    />

                    {paymentSettings.upiQrImage && (
                      <button
                        type="button"
                        className="payment-settings-remove-qr-btn"
                        onClick={handleRemoveQr}
                      >
                        <FiTrash2 />
                        <span>Remove</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="payment-settings-note">
                UPI details and QR are loaded dynamically on the student payment
                page. Nothing is hardcoded.
              </div>
            </div>

            <div className="payment-settings-actions">
              <button
                type="button"
                className="payment-settings-cancel-btn"
                onClick={() => setShowPaymentSettings(false)}
                disabled={isSavingPaymentSettings}
              >
                Cancel
              </button>

              <button
                type="button"
                className="payment-settings-save-btn"
                onClick={handleSavePaymentSettings}
                disabled={isSavingPaymentSettings}
              >
                <FiSave />
                <span>
                  {isSavingPaymentSettings ? "Saving..." : "Save Settings"}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedPayment && (
        <div
          className="payment-details-overlay"
          onClick={() => setSelectedPayment(null)}
        >
          <div
            className="payment-details-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="payment-details-header">
              <div className="payment-details-title-wrap">
                <div className="payment-details-title-icon">
                  <FiCreditCard />
                </div>

                <div>
                  <span>STUDENT PAYMENT DETAILS</span>
                  <h2>Payment Details</h2>
                  <p>Complete fee information for this student</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedPayment(null)}
                aria-label="Close payment details"
                title="Close"
              >
                <FiX />
              </button>
            </div>

            <div className="payment-details-student-card">
              <div className="payment-details-avatar">
                {selectedPayment.studentName?.charAt(0)?.toUpperCase() || "S"}
              </div>

              <div className="payment-details-student-info">
                <small>Student</small>
                <h3>{selectedPayment.studentName}</h3>
              </div>

              <span
                className={`payment-details-status-badge ${selectedPayment.paymentStatus}`}
              >
                {selectedPayment.paymentStatus === "paid" ? (
                  <FiCheckCircle />
                ) : (
                  <FiClock />
                )}
                {selectedPayment.paymentStatus}
              </span>
            </div>

            <div className="payment-details-highlight-grid">
              {canViewTotalFeeColumn && (
                <div className="payment-details-highlight">
                  <span>Total Fee</span>
                  <strong>₹{formatMoney(selectedPayment.totalFee)}</strong>
                </div>
              )}

              <div className="payment-details-highlight">
                <span>Payment Method</span>
                <strong>
                  {formatPaymentMethod(selectedPayment.paymentMethod)}
                </strong>
              </div>
            </div>

            <div className="payment-details-grid">
              <div>
                <span>Roll No</span>
                <strong>{selectedPayment.rollNo}</strong>
              </div>

              <div>
                <span>Course</span>
                <strong>{selectedPayment.course}</strong>
              </div>

              <div>
                <span>Batch</span>
                <strong>{selectedPayment.batch}</strong>
              </div>

              <div>
                <span>Phone</span>
                <strong>{selectedPayment.phone}</strong>
              </div>

              <div>
                <span>Payment Date</span>
                <strong>{formatDate(selectedPayment.paymentDate)}</strong>
              </div>

              <div>
                <span>Payment Status</span>
                <strong
                  className={`detail-status ${selectedPayment.paymentStatus}`}
                >
                  {selectedPayment.paymentStatus}
                </strong>
              </div>
            </div>

            {selectedPayment.paymentProofImage && (
              <div className="payment-details-proof">
                <span>Current Payment Screenshot</span>

                <div className="payment-details-proof-image">
                  <img
                    src={selectedPayment.paymentProofImage}
                    alt="Current payment proof screenshot"
                  />
                </div>
              </div>
            )}

            <div className="payment-details-footer">
              <FiCheckCircle />
              <span>Latest fee status recorded for this student.</span>
            </div>
          </div>
        </div>
      )}

      {historyDeleteTarget && (
        <div
          className="payment-nested-modal-overlay"
          onClick={closeHistoryDeleteConfirm}
        >
          <div
            className="history-delete-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="history-delete-icon">
              <FiTrash2 />
            </div>

            <h2>
              Are you sure you want to delete this payment
              history?
            </h2>

            <p>
              {canViewTotalFeeColumn
                ? `The ₹${formatMoney(
                    historyDeleteTarget.amount,
                  )} collection record will be removed. This only deletes the log entry — it will not change the student's current fee balance.`
                : "This only deletes the log entry — it will not change the student's current fee balance."}
            </p>

            <div className="history-delete-actions">
              <button
                type="button"
                className="history-delete-cancel-btn"
                onClick={closeHistoryDeleteConfirm}
                disabled={isDeletingHistory}
              >
                Cancel
              </button>

              <button
                type="button"
                className="history-delete-confirm-btn"
                onClick={handleConfirmDeleteHistory}
                disabled={isDeletingHistory}
              >
                {isDeletingHistory ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {collectModalStudent && (
        <div
          className="collect-payment-overlay"
          onClick={closeCollectModal}
        >
          <div
            className="collect-payment-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="collect-payment-header">
              <div className="collect-payment-header-title">
                <span>PAYMENT PROOF</span>
                <h2>{collectModalStudent.studentName}</h2>
              </div>

              <div className="collect-payment-header-actions">
                {canViewPaymentDetails && (
                  <button
                    type="button"
                    className={`collect-payment-history-btn ${
                      showCollectHistory ? "active" : ""
                    }`}
                    onClick={toggleCollectHistory}
                    aria-label={
                      showCollectHistory
                        ? "Back to payment proof"
                        : "View fee collection history"
                    }
                    title={
                      showCollectHistory
                        ? "Back to payment proof"
                        : "Fee Collection History"
                    }
                  >
                    <FiClock />
                    <span>History</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={closeCollectModal}
                  aria-label="Close collect payment"
                  title="Close"
                  disabled={isCollectingPayment}
                >
                  <FiX />
                </button>
              </div>
            </div>

            {showCollectHistory ? (
              <div className="collect-payment-history">
                {isLoadingHistory ? (
                  <p className="payment-history-empty">
                    Loading payment history...
                  </p>
                ) : (
                  (() => {
                    // Flattened for display only — each record still comes
                    // straight from its own fee cycle's payment list, so an
                    // amount and its screenshot can never end up mismatched.
                    const historyRecords = historyFeeCycles.flatMap(
                      (feeCycle) => feeCycle.payments,
                    );

                    if (historyRecords.length === 0) {
                      return (
                        <p className="payment-history-empty">
                          No payment history available.
                        </p>
                      );
                    }

                    return (
                      <div className="payment-history-entries">
                        {historyRecords.map((record) => (
                          <div
                            className="payment-history-entry"
                            key={record._id}
                          >
                            {record.paymentProofImage ? (
                              <button
                                type="button"
                                className="payment-history-entry-image-btn"
                                title="View this payment's screenshot"
                                onClick={() =>
                                  setViewingHistoryRecord(record)
                                }
                              >
                                <img
                                  className="payment-history-entry-image"
                                  src={record.paymentProofImage}
                                  alt="Collected payment screenshot"
                                />
                              </button>
                            ) : (
                              <div
                                className="payment-history-entry-image payment-history-entry-image-empty"
                                title="No proof uploaded"
                              >
                                <FiImage />
                              </div>
                            )}

                            <span className="payment-history-entry-details">
                              {canViewTotalFeeColumn && (
                                <strong className="payment-history-amount">
                                  ₹{formatMoney(record.amount)}
                                </strong>
                              )}

                              <span className="payment-history-entry-meta">
                                {formatPaymentMethod(record.paymentMethod)}
                                {" · "}
                                {formatDate(record.paymentDate)}
                              </span>
                            </span>

                            {canCollectPayment && (
                              <button
                                type="button"
                                className="payment-history-delete-btn"
                                title="Delete this history record"
                                onClick={() =>
                                  openHistoryDeleteConfirm(record)
                                }
                              >
                                <FiTrash2 />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    );
                  })()
                )}
              </div>
            ) : collectModalStudent.paymentProofImage ? (
              <div className="collect-payment-proof-image">
                <img
                  src={collectModalStudent.paymentProofImage}
                  alt="Payment proof screenshot"
                />
              </div>
            ) : (
              <div className="collect-payment-proof-empty">
                <FiImage />
                <span>No payment screenshot uploaded</span>
              </div>
            )}

            {canViewFeeBreakdown && (
              <div className="collect-payment-balance-grid">
                <div>
                  <span>Total Fee</span>
                  <strong>
                    ₹{formatMoney(collectModalStudent.totalFee)}
                  </strong>
                </div>

                <div>
                  <span>Collected</span>
                  <strong>
                    ₹{formatMoney(collectModalStudent.paidAmount)}
                  </strong>
                </div>

                <div>
                  <span>Pending</span>
                  <strong>
                    ₹{formatMoney(collectModalStudent.pendingAmount)}
                  </strong>
                </div>
              </div>
            )}

            {canCollectPayment && (
              <div className="collect-payment-form">
                <label>Payment Method</label>

                <div className="collect-payment-method-row">
                  {[
                    ["cash", "Cash"],
                    ["bank", "Bank"],
                    ["upi", "UPI"],
                    ["qr", "QR"],
                  ].map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      className={`collect-payment-method-btn ${
                        collectMethodInput === value ? "active" : ""
                      }`}
                      onClick={() => setCollectMethodInput(value)}
                      disabled={isCollectingPayment}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <label htmlFor="collect-amount">Amount Received</label>

                <input
                  id="collect-amount"
                  type="number"
                  min="1"
                  max={
                    canSeeStudentFeeNumbers
                      ? collectModalStudent.pendingAmount
                      : undefined
                  }
                  placeholder={
                    canSeeStudentFeeNumbers
                      ? `Up to ₹${formatMoney(
                          collectModalStudent.pendingAmount,
                        )}`
                      : "Enter amount received"
                  }
                  value={collectAmountInput}
                  onChange={(event) =>
                    setCollectAmountInput(event.target.value)
                  }
                  disabled={isCollectingPayment || isRefreshingCollectModal}
                />

                <button
                  type="button"
                  className="collect-payment-btn"
                  onClick={handleCollectPayment}
                  disabled={isCollectingPayment || isRefreshingCollectModal}
                >
                  <FiCheck />
                  {isCollectingPayment
                    ? "Collecting..."
                    : isRefreshingCollectModal
                      ? "Refreshing..."
                      : "Collect"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {generateFeeStudent && (() => {
        const isEditingActiveFee =
          generateFeeStudent.hasFeeCycle &&
          generateFeeStudent.paymentStatus !== "paid";

        return (
          <div
            className="payment-details-overlay"
            onClick={closeGenerateFeeModal}
          >
            <div
              className="generate-fee-modal"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="generate-fee-header">
                <div>
                  <span>
                    {isEditingActiveFee ? "EDIT FEE" : "GENERATE FEE"}
                  </span>
                  <h2>{generateFeeStudent.studentName}</h2>
                </div>

                <button
                  type="button"
                  onClick={closeGenerateFeeModal}
                  aria-label="Close fee editor"
                  title="Close"
                  disabled={isGeneratingFee}
                >
                  <FiX />
                </button>
              </div>

              <div className="generate-fee-body">
                {generateFeeStudent.hasFeeCycle && (
                  <div className="generate-fee-previous">
                    <span>
                      {isEditingActiveFee ? "Current Fee" : "Previous Fee"}
                    </span>

                    <strong>
                      {canViewTotalFeeColumn
                        ? `₹${formatMoney(generateFeeStudent.totalFee)}`
                        : "—"}{" "}
                      —{" "}
                      {isEditingActiveFee
                        ? generateFeeStudent.paymentStatus === "partial"
                          ? "Partially Paid"
                          : "Unpaid"
                        : "Fully Paid"}
                    </strong>
                  </div>
                )}

                <label htmlFor="generate-fee-amount">
                  {isEditingActiveFee
                    ? "Updated Fee Amount"
                    : "New Fee Amount"}
                </label>

                <input
                  id="generate-fee-amount"
                  type="number"
                  min={
                    isEditingActiveFee
                      ? generateFeeStudent.paidAmount || 1
                      : 1
                  }
                  placeholder={
                    isEditingActiveFee
                      ? "Enter updated fee amount"
                      : "Enter new fee amount"
                  }
                  value={generateFeeAmountInput}
                  onChange={(event) =>
                    setGenerateFeeAmountInput(event.target.value)
                  }
                  disabled={isGeneratingFee}
                />

                <div className="generate-fee-actions">
                  <button
                    type="button"
                    className="generate-fee-cancel-btn"
                    onClick={closeGenerateFeeModal}
                    disabled={isGeneratingFee}
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    className="generate-fee-confirm-btn"
                    onClick={handleGenerateFee}
                    disabled={isGeneratingFee}
                  >
                    {isEditingActiveFee ? <FiSave /> : <FiPlus />}
                    {isGeneratingFee
                      ? isEditingActiveFee
                        ? "Updating..."
                        : "Generating..."
                      : isEditingActiveFee
                        ? "Update Fee"
                        : "Generate Fee"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {viewingHistoryRecord && (
        <div
          className="payment-nested-modal-overlay"
          onClick={() => setViewingHistoryRecord(null)}
        >
          <div
            className="history-image-viewer"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="history-image-viewer-header">
              <strong>
                ₹{formatMoney(viewingHistoryRecord.amount)}
              </strong>

              <button
                type="button"
                onClick={() => setViewingHistoryRecord(null)}
                aria-label="Close screenshot"
                title="Close"
              >
                <FiX />
              </button>
            </div>

            <div className="history-image-viewer-body">
              <img
                src={viewingHistoryRecord.paymentProofImage}
                alt="Payment screenshot"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Payments;
