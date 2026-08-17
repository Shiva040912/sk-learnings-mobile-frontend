import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import {
  FiCalendar,
  FiCheckCircle,
  FiCreditCard,
  FiLoader,
  FiLock,
  FiShield,
} from "react-icons/fi";

import api from "../services/axios";

import logo from "../assets/sk-logo.png";
import gpayLogo from "../assets/Gpay.png";
import phonePeLogo from "../assets/phonepay.png";
import paytmLogo from "../assets/paytm.PNG";

import "../styles/studentpayment.css";

const StudentPayment = () => {
  const { studentId } = useParams();

  const [paymentData, setPaymentData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchPaymentDetails = async () => {
      try {
        setIsLoading(true);
        setError("");

        const response = await api.get(
          `/payments/public/student/${studentId}`
        );

        setPaymentData(response.data || null);
      } catch (err) {
        setError(
          err.response?.data?.message ||
            "Unable to load payment details"
        );
      } finally {
        setIsLoading(false);
      }
    };

    if (studentId) {
      fetchPaymentDetails();
    }
  }, [studentId]);

  const student = paymentData?.student;
  const payment = paymentData?.payment;

  const transactionReference = useMemo(() => {
    const id = student?.id || student?._id;

    if (!id) {
      return "";
    }

    return `SK-${id}-${Date.now()}`;
  }, [student]);

  const formatDate = (value) => {
    if (!value) {
      return "-";
    }

    return new Date(value).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const buildUpiQuery = () => {
    if (!payment?.upiId || !payment?.receiverName) {
      return "";
    }

    const params = new URLSearchParams({
      pa: payment.upiId,
      pn: payment.receiverName,
      tr: transactionReference,
      tn: `Fee Payment - ${student?.rollNo || "Student"}`,
      am: String(student?.paymentAmount || 0),
      cu: "INR",
    });

    return params.toString();
  };

  const showPaymentError = () => {
    setError(
      "UPI payment configuration is not available"
    );
  };

  const openGooglePay = () => {
    const query = buildUpiQuery();

    if (!query) {
      showPaymentError();
      return;
    }

    window.location.href = `gpay://upi/pay?${query}`;
  };

  const openPhonePe = () => {
    const query = buildUpiQuery();

    if (!query) {
      showPaymentError();
      return;
    }

    window.location.href = `upi://pay?${query}`;
  };

  const openPaytm = () => {
    const query = buildUpiQuery();

    if (!query) {
      showPaymentError();
      return;
    }

    window.location.href = `upi://pay?${query}`;
  };

  if (isLoading) {
    return (
      <div className="student-payment-page">
        <div className="payment-state-card">
          <FiLoader className="payment-loading-icon" />

          <strong>
            Loading payment page
          </strong>

          <span>
            Please wait...
          </span>
        </div>
      </div>
    );
  }

  if (error || !student || !payment) {
    return (
      <div className="student-payment-page">
        <div className="payment-state-card payment-error-state">
          <FiCreditCard />

          <strong>
            Payment page unavailable
          </strong>

          <span>
            {error ||
              "Student payment details not found"}
          </span>
        </div>
      </div>
    );
  }

  const isPaid =
    student.paymentStatus === "paid";

  const isConfigured =
    payment.isConfigured;

  return (
    <div className="student-payment-page">
      <main className="student-payment-shell">
        <header className="payment-topbar">
          <div className="payment-brand">
            <img
              src={logo}
              alt="The SK Learnings"
            />

            <div>
              <h1>
                THE SK LEARNINGS
              </h1>

              <span>
                Private Educational Services
              </span>
            </div>
          </div>

          <div className="payment-secure-badge">
            <FiLock />
            Secure
          </div>
        </header>

        <section className="payment-hero">
          <span className="payment-eyebrow">
            FEE PAYMENT
          </span>

          <h2>
            Complete Payment
          </h2>

          <p>
            Verify the student details and
            continue using your preferred UPI app.
          </p>
        </section>

        <section className="payment-checkout-card">
          <div className="payment-card-header">
            <div>
              <span>
                PAYMENT FOR
              </span>

              <strong>
                {student.studentName}
              </strong>
            </div>

            <div className="payment-card-icon">
              <FiCreditCard />
            </div>
          </div>

          <div className="payment-detail-grid">
            <div className="payment-detail-item">
              <span>
                Roll Number
              </span>

              <strong>
                {student.rollNo}
              </strong>
            </div>

            <div className="payment-detail-item">
              <span>
                Course
              </span>

              <strong>
                {student.course}
              </strong>
            </div>

            <div className="payment-detail-item">
              <span>
                Batch
              </span>

              <strong>
                {student.batch || "-"}
              </strong>
            </div>

            <div className="payment-detail-item due-date-item">
              <span>
                Due Date
              </span>

              <strong>
                <FiCalendar />
                {formatDate(
                  payment.feeDueDate
                )}
              </strong>
            </div>
          </div>
        </section>

        {isPaid ? (
          <section className="payment-paid-box">
            <FiCheckCircle />

            <div>
              <strong>
                Payment Completed
              </strong>

              <span>
                This student's fee has already
                been marked as paid.
              </span>
            </div>
          </section>
        ) : (
          <section className="payment-method-card">
            <div className="payment-method-title">
              <div>
                <span>
                  PAYMENT METHOD
                </span>

                <h3>
                  Pay using UPI
                </h3>
              </div>

              <FiShield />
            </div>

            {!isConfigured ? (
              <div className="payment-config-error">
                Payment configuration is not
                available. Please contact the
                institute.
              </div>
            ) : (
              <div className="upi-buttons-row">
                <button
                  type="button"
                  className="mini-upi-btn"
                  onClick={openGooglePay}
                >
                  <img
                    src={gpayLogo}
                    alt="Google Pay"
                  />

                  <span>
                    GPay
                  </span>
                </button>

                <button
                  type="button"
                  className="mini-upi-btn"
                  onClick={openPhonePe}
                >
                  <img
                    src={phonePeLogo}
                    alt="PhonePe"
                  />

                  <span>
                    PhonePe
                  </span>
                </button>

                <button
                  type="button"
                  className="mini-upi-btn"
                  onClick={openPaytm}
                >
                  <img
                    src={paytmLogo}
                    alt="Paytm"
                  />

                  <span>
                    Paytm
                  </span>
                </button>
              </div>
            )}

            <div className="payment-method-note">
              Tap a payment app to continue securely.
            </div>
          </section>
        )}

        <section className="payment-trust-strip">
          <div>
            <FiShield />

            <span>
              Secure UPI
            </span>
          </div>

          <div className="trust-divider" />

          <div>
            <FiLock />

            <span>
              Protected Payment
            </span>
          </div>
        </section>

        <footer className="payment-footer">
          <strong>
            THE SK LEARNINGS
          </strong>

          <span>
            Secure fee payment portal
          </span>
        </footer>
      </main>
    </div>
  );
};

export default StudentPayment;

////git pushing