import { useEffect, useMemo, useState } from "react";
import {
  FiBell,
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiCreditCard,
  FiDollarSign,
  FiFilter,
  FiSearch,
  FiX,
} from "react-icons/fi";
import toast from "react-hot-toast";

import api from "../services/axios";
import "../styles/payments.css";

const Payments = () => {
  const [students, setStudents] = useState([]);
  const [paymentRecords, setPaymentRecords] = useState([]);
  const [feeDueDate, setFeeDueDate] = useState("");
  const [selectedDueDate, setSelectedDueDate] = useState("");
  const [search, setSearch] = useState("");
  const [methodFilter, setMethodFilter] = useState("all");
  const [courseFilter, setCourseFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [batchFilter, setBatchFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingDueDate, setIsSavingDueDate] = useState(false);
  const [isSendingReminders, setIsSendingReminders] = useState(false);
  const [paymentMethodStudent, setPaymentMethodStudent] = useState(null);
  const [paymentUpdatingStudentId, setPaymentUpdatingStudentId] =
    useState(null);

  const fetchPaymentPageData = async () => {
    try {
      setIsLoading(true);

      const [studentsResponse, paymentsResponse] = await Promise.all([
        api.get("/students"),
        api.get("/payments"),
      ]);

      setStudents(studentsResponse.data || []);
      setPaymentRecords(paymentsResponse.data || []);
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to load payment details",
      );
    } finally {
      setIsLoading(false);
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

  useEffect(() => {
    fetchPaymentPageData();
    fetchFeeDueDate();

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

  const paymentRows = useMemo(() => {
    return students.map((student) => {
      const studentPaymentRecords = paymentRecords.filter(
        (payment) =>
          String(payment.studentId) === String(student._id) ||
          String(payment.student?._id) === String(student._id),
      );

      const latestPayment = studentPaymentRecords.sort(
        (firstPayment, secondPayment) =>
          new Date(secondPayment.paymentDate || 0) -
          new Date(firstPayment.paymentDate || 0),
      )[0];

      const isPaid = student.paymentStatus === "paid";

      return {
        _id: student._id,
        studentName: student.studentName || "-",
        rollNo: student.rollNo || "-",
        course: student.course || "-",
        batch: student.batch || "-",
        phone: student.phone || "-",
        totalFee: Number(student.totalFee || 0),
        paymentStatus: isPaid ? "paid" : "unpaid",
        paymentDate: isPaid
          ? latestPayment?.paymentDate || student.updatedAt || null
          : null,
        paymentMethod: isPaid
          ? latestPayment?.paymentMethod || student.paymentMethod || ""
          : "",
      };
    });
  }, [students, paymentRecords]);

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
          statusFilter === "all" || payment.paymentStatus === statusFilter;

        const matchesMethod =
          methodFilter === "all" || payment.paymentMethod === methodFilter;

        const matchesCourse =
          courseFilter === "all" || payment.course === courseFilter;

        const matchesBatch =
          batchFilter === "all" || payment.batch === batchFilter;

        return (
          matchesSearch &&
          matchesCourse &&
          matchesStatus &&
          matchesMethod &&
          matchesBatch
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
  ]);

  const summary = useMemo(() => {
    return paymentRows.reduce(
      (result, payment) => {
        result.totalStudents += 1;

        if (payment.paymentStatus === "paid") {
          result.paidStudents += 1;
          result.totalCollected += payment.totalFee;

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
  const handleSendReminders = async () => {
    if (!feeDueDate) {
      toast.error("Please set the common fee due date first");
      return;
    }

    if (isSendingReminders) {
      return;
    }

    try {
      setIsSendingReminders(true);

      const response = await api.post("/payments/send-reminders");

      const result = response.data || {};
      const sent = Number(result.sent || 0);
      const failed = Number(result.failed || 0);
      const totalEligible = Number(result.totalEligible || 0);

      if (sent > 0 && failed === 0) {
        toast.success(
          `${sent} fee reminder${sent > 1 ? "s" : ""} sent successfully`,
        );
        return;
      }

      if (sent > 0 && failed > 0) {
        toast(`${sent} sent successfully, ${failed} failed`, {
          icon: "⚠️",
        });
        return;
      }

      if (totalEligible === 0) {
        toast(result.message || "No unpaid students found for reminder", {
          icon: "ℹ️",
        });
        return;
      }

      if (failed > 0) {
        toast.error(
          `Failed to send ${failed} fee reminder${failed > 1 ? "s" : ""}`,
        );
        return;
      }

      toast(result.message || "No fee reminders were sent", {
        icon: "ℹ️",
      });
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to send fee reminders",
      );
    } finally {
      setIsSendingReminders(false);
    }
  };

  const handlePaymentToggle = (student) => {
    if (
      student.paymentStatus === "paid" ||
      paymentUpdatingStudentId === student._id
    ) {
      return;
    }

    setPaymentMethodStudent(student);

    toast("Select the payment method", {
      icon: "💳",
    });
  };

  const handlePaymentMethodSelect = async (student, paymentMethod) => {
    if (!paymentMethod || !student) {
      return;
    }

    const totalFee = Number(student.totalFee || 0);

    if (totalFee <= 0) {
      toast.error("Student total fee is invalid");
      return;
    }

    try {
      setPaymentUpdatingStudentId(student._id);

      await api.patch(`/students/${student._id}`, {
        paymentStatus: "paid",
        paymentMethod,
        paidAmount: totalFee,
        pendingAmount: 0,
      });

      setPaymentMethodStudent(null);

      toast.success(`${student.studentName} payment marked as paid`);

      await fetchPaymentPageData();
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to update payment status",
      );
    } finally {
      setPaymentUpdatingStudentId(null);
    }
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
      <div className="payments-top-grid">
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
                    <option value="unpaid">Unpaid</option>
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
              </div>
            )}
          </div>

          <div className="toolbar-fee-date">
            <FiCalendar />

            <input
              type="date"
              value={selectedDueDate}
              onChange={(event) => setSelectedDueDate(event.target.value)}
            />

            <button
              type="button"
              onClick={handleSaveDueDate}
              disabled={isSavingDueDate}
            >
              {isSavingDueDate ? "Saving..." : "Set Date"}
            </button>

            <button
              type="button"
              className="send-fee-reminder-btn"
              onClick={handleSendReminders}
              disabled={isSendingReminders || !feeDueDate}
              title="Send WhatsApp reminder to unpaid students"
            >
              <FiBell />

              <span>{isSendingReminders ? "Sending..." : "Send Reminder"}</span>
            </button>
          </div>
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
              <strong>No students found</strong>
              <span>Try changing your search or filter</span>
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
                    <th>Phone</th>
                    <th>Total Fee</th>
                    <th>Status</th>
                    <th>Payment Date</th>
                    <th>Method</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredPayments.map((payment, index) => (
                    <tr
                      key={payment._id}
                      className={
                        paymentMethodStudent?._id === payment._id
                          ? "payment-row selecting-method"
                          : "payment-row"
                      }
                      onClick={() => setSelectedPayment(payment)}
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

                      <td>{payment.phone}</td>

                      <td>
                        <strong className="payment-amount">
                          ₹{formatMoney(payment.totalFee)}
                        </strong>
                      </td>

                      <td>
                        <button
                          type="button"
                          className={`payment-switch ${
                            payment.paymentStatus === "paid"
                              ? "is-paid"
                              : "is-unpaid"
                          }`}
                          onClick={(event) => {
                            event.stopPropagation();

                            handlePaymentToggle(payment);
                          }}
                          disabled={
                            payment.paymentStatus === "paid" ||
                            paymentUpdatingStudentId === payment._id
                          }
                        >
                          <span className="payment-switch-track">
                            <span className="payment-switch-thumb" />
                          </span>

                          <span className="payment-switch-label">
                            {payment.paymentStatus === "paid"
                              ? "Paid"
                              : "Unpaid"}
                          </span>
                        </button>
                      </td>

                      <td>{formatDate(payment.paymentDate)}</td>

                      <td>
                        {paymentMethodStudent?._id === payment._id &&
                        payment.paymentStatus !== "paid" ? (
                          <div className="inline-payment-methods">
                            {[
                              ["cash", "Cash"],
                              ["bank", "Bank"],
                              ["upi", "UPI"],
                              ["qr", "QR"],
                            ].map(([value, label]) => (
                              <button
                                key={value}
                                type="button"
                                className="inline-payment-method-btn"
                                onClick={(event) => {
                                  event.stopPropagation();

                                  handlePaymentMethodSelect(payment, value);
                                }}
                                disabled={
                                  paymentUpdatingStudentId === payment._id
                                }
                              >
                                {label}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <span className="payment-method">
                            {formatPaymentMethod(payment.paymentMethod)}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

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
              <div>
                <span>STUDENT PAYMENT DETAILS</span>
                <h2>{selectedPayment.studentName}</h2>
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
                <span>Total Fee</span>
                <strong>₹{formatMoney(selectedPayment.totalFee)}</strong>
              </div>

              <div>
                <span>Status</span>
                <strong
                  className={`detail-status ${selectedPayment.paymentStatus}`}
                >
                  {selectedPayment.paymentStatus}
                </strong>
              </div>

              <div>
                <span>Payment Date</span>
                <strong>{formatDate(selectedPayment.paymentDate)}</strong>
              </div>

              <div>
                <span>Payment Method</span>
                <strong>
                  {formatPaymentMethod(selectedPayment.paymentMethod)}
                </strong>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Payments;
