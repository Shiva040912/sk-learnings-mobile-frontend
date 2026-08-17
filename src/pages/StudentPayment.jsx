import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import {
  FiCalendar,
  FiCheckCircle,
  FiCreditCard,
  FiLoader,
  FiShield,
} from "react-icons/fi";

import api from "../services/axios";

import logo from "../assets/sk-logo.png";
import gpayLogo from "../assets/Gpay.png";
import phonePeLogo from "../assets/phonepay.png";
import paytmLogo from "../assets/paytm.png";

import "../styles/studentpayment.css";

const StudentPayment = () => {
  const { studentId } = useParams();

  const [paymentData, setPaymentData] =
    useState(null);

  const [isLoading, setIsLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {
    const fetchPaymentDetails = async () => {
      try {
        setIsLoading(true);
        setError("");

        const response = await api.get(
          `/payments/public/student/${studentId}`
        );

        setPaymentData(
          response.data || null
        );
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

  const student =
    paymentData?.student;

  const payment =
    paymentData?.payment;

  const transactionReference =
    useMemo(() => {
      const id =
        student?.id ||
        student?._id;

      if (!id) {
        return "";
      }

      return `SK-${id}-${Date.now()}`;
    }, [student]);

  const formatDate = (value) => {
    if (!value) {
      return "-";
    }

    return new Date(
      value
    ).toLocaleDateString(
      "en-IN",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }
    );
  };

  const buildUpiQuery = () => {
    if (
      !payment?.upiId ||
      !payment?.receiverName
    ) {
      return "";
    }

    const params =
      new URLSearchParams({
        pa: payment.upiId,
        pn: payment.receiverName,
        tr: transactionReference,
        tn: `Fee Payment - ${
          student?.rollNo ||
          "Student"
        }`,
        am: String(
          student?.paymentAmount || 0
        ),
        cu: "INR",
      });

    return params.toString();
  };

  const handleUpiError = () => {
    setError(
      "UPI payment configuration is not available"
    );
  };

  const openGooglePay = () => {
    const query =
      buildUpiQuery();

    if (!query) {
      handleUpiError();
      return;
    }

    window.location.href =
      `gpay://upi/pay?${query}`;
  };

  const openPhonePe = () => {
    const query =
      buildUpiQuery();

    if (!query) {
      handleUpiError();
      return;
    }

    window.location.href =
      `upi://pay?${query}`;
  };

  const openPaytm = () => {
    const query =
      buildUpiQuery();

    if (!query) {
      handleUpiError();
      return;
    }

    window.location.href =
      `upi://pay?${query}`;
  };

  if (isLoading) {
    return (
      <div className="student-payment-page">
        <div className="student-payment-loader-card">
          <FiLoader />

          <strong>
            Loading Payment Details
          </strong>

          <span>
            Please wait for a moment
          </span>
        </div>
      </div>
    );
  }

  if (
    error ||
    !student ||
    !payment
  ) {
    return (
      <div className="student-payment-page">
        <div className="student-payment-error-card">
          <FiCreditCard />

          <strong>
            Payment Page Unavailable
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
    student.paymentStatus ===
    "paid";

  const isConfigured =
    payment.isConfigured;

  return (
    <div className="student-payment-page">
      <main className="student-payment-shell">
        {/* Brand */}

        <header className="student-payment-brand">
          <div className="student-payment-logo-box">
            <img
              src={logo}
              alt="The SK Learnings"
            />
          </div>

          <div className="student-payment-brand-content">
            <h1>
              THE SK LEARNINGS
            </h1>

            <p>
              Private Educational
              Services
            </p>
          </div>
        </header>

        {/* Heading */}

        <section className="student-payment-heading">
          <span className="payment-page-eyebrow">
            SECURE FEE PAYMENT
          </span>

          <h2>
            Pay Now
          </h2>

          <p>
            Verify the student details
            below and choose your
            preferred UPI app.
          </p>
        </section>

        {/* Student details */}

        <section className="student-payment-student-card">
          <div className="student-payment-card-title">
            <div>
              <span>
                STUDENT DETAILS
              </span>

              <strong>
                Fee Payment Information
              </strong>
            </div>

            <div className="student-detail-card-icon">
              <FiCreditCard />
            </div>
          </div>

          <div className="student-payment-details">
            <div className="student-payment-detail-row">
              <span>
                Student Name
              </span>

              <strong>
                {student.studentName}
              </strong>
            </div>

            <div className="student-payment-detail-row">
              <span>
                Roll Number
              </span>

              <strong>
                {student.rollNo}
              </strong>
            </div>

            <div className="student-payment-detail-row">
              <span>
                Course
              </span>

              <strong>
                {student.course}
              </strong>
            </div>

            <div className="student-payment-detail-row">
              <span>
                Batch
              </span>

              <strong>
                {student.batch || "-"}
              </strong>
            </div>

            <div className="student-payment-detail-row">
              <span>
                Due Date
              </span>

              <strong className="student-payment-due-date">
                <FiCalendar />

                {formatDate(
                  payment.feeDueDate
                )}
              </strong>
            </div>
          </div>
        </section>

        {/* Paid */}

        {isPaid ? (
          <section className="student-payment-paid-card">
            <div className="payment-success-icon">
              <FiCheckCircle />
            </div>

            <strong>
              Payment Completed
            </strong>

            <span>
              This student's fee has
              already been marked as
              paid.
            </span>
          </section>
        ) : (
          <section className="student-payment-method-section">
            <div className="student-payment-method-heading">
              <span>
                PAY NOW
              </span>

              <h3>
                Choose UPI App
              </h3>

              <p>
                Select an app below to
                continue your payment.
              </p>
            </div>

            {!isConfigured ? (
              <div className="student-payment-config-error">
                Payment configuration
                is not available.
                Please contact The SK
                Learnings.
              </div>
            ) : (
              <div className="student-payment-method-buttons">
                <button
                  type="button"
                  className="upi-app-button"
                  onClick={
                    openGooglePay
                  }
                >
                  <div className="upi-app-logo-box">
                    <img
                      src={gpayLogo}
                      alt="Google Pay"
                      className="upi-app-logo gpay-logo"
                    />
                  </div>

                  <span>
                    Google Pay
                  </span>
                </button>

                <button
                  type="button"
                  className="upi-app-button"
                  onClick={
                    openPhonePe
                  }
                >
                  <div className="upi-app-logo-box">
                    <img
                      src={phonePeLogo}
                      alt="PhonePe"
                      className="upi-app-logo phonepe-logo"
                    />
                  </div>

                  <span>
                    PhonePe
                  </span>
                </button>

                <button
                  type="button"
                  className="upi-app-button"
                  onClick={
                    openPaytm
                  }
                >
                  <div className="upi-app-logo-box">
                    <img
                      src={paytmLogo}
                      alt="Paytm"
                      className="upi-app-logo paytm-logo"
                    />
                  </div>

                  <span>
                    Paytm
                  </span>
                </button>
              </div>
            )}
          </section>
        )}

        {/* Security */}

        <footer className="student-payment-footer">
          <div className="payment-secure-icon">
            <FiShield />
          </div>

          <div>
            <strong>
              Secure UPI Payment
            </strong>

            <span>
              You will be redirected
              securely to your selected
              UPI application to
              complete the payment.
            </span>
          </div>
        </footer>
      </main>
    </div>
  );
};

export default StudentPayment;