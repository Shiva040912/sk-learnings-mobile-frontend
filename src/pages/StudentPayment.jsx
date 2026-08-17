import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import {
  FiCalendar,
  FiCheckCircle,
  FiCreditCard,
  FiLoader,
} from "react-icons/fi";

import api from "../services/axios";
import logo from "../assets/sk-logo.png";

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
      if (!student?._id && !student?.id) {
        return "";
      }

      const id =
        student.id ||
        student._id;

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
          student?.rollNo || "Student"
        }`,
        am: String(
          student?.paymentAmount || 0
        ),
        cu: "INR",
      });

    return params.toString();
  };

  const openGooglePay = () => {
    const query =
      buildUpiQuery();

    if (!query) {
      setError(
        "UPI payment configuration is not available"
      );
      return;
    }

    window.location.href =
      `gpay://upi/pay?${query}`;
  };

  const openPhonePe = () => {
    const query =
      buildUpiQuery();

    if (!query) {
      setError(
        "UPI payment configuration is not available"
      );
      return;
    }

    window.location.href =
      `upi://pay?${query}`;
  };

  const openPaytm = () => {
    const query =
      buildUpiQuery();

    if (!query) {
      setError(
        "UPI payment configuration is not available"
      );
      return;
    }

    window.location.href =
      `upi://pay?${query}`;
  };

  if (isLoading) {
    return (
      <div className="student-payment-page">
        <div className="student-payment-loader">
          <FiLoader />
          <span>
            Loading payment details...
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
        <div className="student-payment-error">
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
    student.paymentStatus ===
    "paid";

  const isConfigured =
    payment.isConfigured;

  return (
    <div className="student-payment-page">
      <div className="student-payment-shell">
        <header className="student-payment-brand">
          <img
            src={logo}
            alt="The SK Learnings"
          />

          <div>
            <h1>
              THE SK LEARNINGS
            </h1>

            <p>
              Private Educational Services
            </p>
          </div>
        </header>

        <section className="student-payment-heading">
          <span>
            SECURE FEE PAYMENT
          </span>

          <h2>
            Pay Now
          </h2>

          <p>
            Complete your fee payment
            securely using UPI.
          </p>
        </section>

        <section className="student-payment-student-card">
          <div className="student-payment-card-title">
            <span>
              STUDENT DETAILS
            </span>

            <FiCreditCard />
          </div>

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
              Roll No
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
        </section>

        {isPaid ? (
          <section className="student-payment-paid-card">
            <FiCheckCircle />

            <strong>
              Payment Completed
            </strong>

            <span>
              Your fee payment has
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
            </div>

            {!isConfigured ? (
              <div className="student-payment-config-error">
                Payment configuration
                is not available.
                Please contact the
                institute.
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
                  <span className="upi-app-icon gpay-icon">
                    G
                  </span>

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
                  <span className="upi-app-icon phonepe-icon">
                    P
                  </span>

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
                  <span className="upi-app-icon paytm-icon">
                    P
                  </span>

                  <span>
                    Paytm
                  </span>
                </button>
              </div>
            )}
          </section>
        )}

        <footer className="student-payment-footer">
          <FiCheckCircle />

          <div>
            <strong>
              Secure UPI Payment
            </strong>

            <span>
              You will be redirected
              to your selected UPI app
              to complete the payment.
            </span>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default StudentPayment;