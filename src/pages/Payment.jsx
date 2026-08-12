import { useEffect, useMemo, useState } from "react";
import {
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiCreditCard,
  FiDollarSign,
  FiFilter,
  FiSearch,
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
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingDueDate, setIsSavingDueDate] = useState(false);
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
        error.response?.data?.message ||
          "Failed to load payment details"
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
        const formattedDate = new Date(date)
          .toISOString()
          .split("T")[0];

        setFeeDueDate(formattedDate);
        setSelectedDueDate(formattedDate);
      }
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          "Failed to load fee due date"
      );
    }
  };

  useEffect(() => {
    fetchPaymentPageData();
    fetchFeeDueDate();
  }, []);

  const paymentRows = useMemo(() => {
    return students.map((student) => {
      const studentPaymentRecords = paymentRecords.filter(
        (payment) =>
          String(payment.studentId) === String(student._id) ||
          String(payment.student?._id) === String(student._id)
      );

      const latestPayment = studentPaymentRecords.sort(
        (firstPayment, secondPayment) =>
          new Date(secondPayment.paymentDate || 0) -
          new Date(firstPayment.paymentDate || 0)
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
      [...new Set(paymentRows.map((payment) => payment.course))]
        .filter((course) => course && course !== "-"),
    [paymentRows]
  );

  const batchOptions = useMemo(
    () =>
      [...new Set(paymentRows.map((payment) => payment.batch))]
        .filter((batch) => batch && batch !== "-"),
    [paymentRows]
  );

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
          payment.paymentStatus === statusFilter;

        const matchesMethod =
          methodFilter === "all" ||
          payment.paymentMethod === methodFilter;

        const matchesCourse =
          courseFilter === "all" ||
          payment.course === courseFilter;

        const matchesBatch =
          batchFilter === "all" ||
          payment.batch === batchFilter;

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
          }
        )
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
      }
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

      toast.success(
        response.data?.message ||
          "Fee due date updated successfully"
      );
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          "Failed to update fee due date"
      );
    } finally {
      setIsSavingDueDate(false);
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

  const handlePaymentMethodSelect = async (
    student,
    paymentMethod
  ) => {
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

      toast.success(
        `${student.studentName} payment marked as paid`
      );

      await fetchPaymentPageData();
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          "Failed to update payment status"
      );
    } finally {
      setPaymentUpdatingStudentId(null);
    }
  };

  const formatMoney = (value) =>
    Number(value || 0).toLocaleString("en-IN");

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

  const isDueDateExpired = useMemo(() => {
    if (!feeDueDate) return false;

    const today = new Date();
    const dueDate = new Date(`${feeDueDate}T23:59:59`);

    return today > dueDate;
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
                    isDueDateExpired
                      ? "due-date-state expired"
                      : "due-date-state active"
                  }
                >
                  <FiClock />
                  {isDueDateExpired ? "Completed" : "Active"}
                </small>
              )}
            </div>

            <strong>
              {feeDueDate ? formatDate(feeDueDate) : "Not Set"}
            </strong>
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
              className={`payment-filter-button ${
                showFilters ? "active" : ""
              }`}
              onClick={() =>
                setShowFilters((current) => !current)
              }
            >
              <FiFilter />
              <span>Filter</span>

              {(courseFilter !== "all" ||
                statusFilter !== "all" ||
                methodFilter !== "all" ||
                batchFilter !== "all") && (
                <span className="filter-active-dot" />
              )}
            </button>

            {showFilters && (
              <div className="payment-filter-dropdown">
                <div className="payment-filter-header">
                  <strong>Filter Payments</strong>

                  <button
                    type="button"
                    onClick={() => {
                      setCourseFilter("all");
                      setStatusFilter("all");
                      setMethodFilter("all");
                      setBatchFilter("all");
                    }}
                  >
                    Clear
                  </button>
                </div>

                <div className="payment-filter-field">
                  <label>Course</label>

                  <select
                    value={courseFilter}
                    onChange={(event) =>
                      setCourseFilter(event.target.value)
                    }
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
                    onChange={(event) =>
                      setStatusFilter(event.target.value)
                    }
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
                    onChange={(event) =>
                      setMethodFilter(event.target.value)
                    }
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
                    onChange={(event) =>
                      setBatchFilter(event.target.value)
                    }
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
              onChange={(event) =>
                setSelectedDueDate(event.target.value)
              }
            />

            <button
              type="button"
              onClick={handleSaveDueDate}
              disabled={isSavingDueDate}
            >
              {isSavingDueDate ? "Saving..." : "Set Date"}
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
                    >
                      <td>{index + 1}</td>

                      <td>
                        <div className="payment-student">
                          <div className="payment-avatar">
                            {payment.studentName
                              ?.charAt(0)
                              ?.toUpperCase() || "S"}
                          </div>

                          <div>
                            <strong>{payment.studentName}</strong>
                            <span>Fee Payment</span>
                          </div>
                        </div>
                      </td>

                      <td>{payment.rollNo}</td>

                      <td>
                        <span className="payment-course">
                          {payment.course}
                        </span>
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
                          onClick={() => handlePaymentToggle(payment)}
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
                                onClick={() =>
                                  handlePaymentMethodSelect(
                                    payment,
                                    value
                                  )
                                }
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
                            {formatPaymentMethod(
                              payment.paymentMethod
                            )}
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
    </div>
  );
};

export default Payments;