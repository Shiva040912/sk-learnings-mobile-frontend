import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import {
  FiCalendar,
  FiCheckCircle,
  FiCreditCard,
  FiImage,
  FiLoader,
  FiLock,
  FiRefreshCw,
  FiShield,
  FiTrash2,
  FiUploadCloud,
} from "react-icons/fi";
import toast from "react-hot-toast";

import api from "../services/axios";

import logo from "../assets/sk-logo.png";
import gpayLogo from "../assets/Gpay.png";
import phonePeLogo from "../assets/phonepay.png";
import paytmLogo from "../assets/paytm.PNG";

import "../styles/studentpayment.css";

const StudentPayment = () => {
  const { studentId } = useParams();

  const [paymentData, setPaymentData] =
    useState(null);

  const [isLoading, setIsLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [proofImage, setProofImage] =
    useState("");

  const [proofUploadedAt, setProofUploadedAt] =
    useState(null);

  const [isUploadingProof, setIsUploadingProof] =
    useState(false);

  const [isRemovingProof, setIsRemovingProof] =
    useState(false);

  const [proofError, setProofError] =
    useState("");

  const proofFileInputRef = useRef(null);

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

        setProofImage(
          response.data?.student
            ?.paymentProofImage || ""
        );

        setProofUploadedAt(
          response.data?.student
            ?.paymentProofUploadedAt || null
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

  const compressProofImage = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => {
        const image = new Image();

        image.onload = () => {
          const maxDimension = 1080;

          const scale = Math.min(
            1,
            maxDimension /
              Math.max(
                image.width,
                image.height
              )
          );

          const canvas =
            document.createElement(
              "canvas"
            );

          canvas.width =
            Math.round(
              image.width * scale
            );

          canvas.height =
            Math.round(
              image.height * scale
            );

          const context =
            canvas.getContext("2d");

          context.fillStyle =
            "#ffffff";

          context.fillRect(
            0,
            0,
            canvas.width,
            canvas.height
          );

          context.drawImage(
            image,
            0,
            0,
            canvas.width,
            canvas.height
          );

          resolve(
            canvas.toDataURL(
              "image/jpeg",
              0.85
            )
          );
        };

        image.onerror = () =>
          reject(
            new Error(
              "Unable to read the selected image"
            )
          );

        image.src = String(
          reader.result || ""
        );
      };

      reader.onerror = () =>
        reject(
          new Error(
            "Unable to read the selected image"
          )
        );

      reader.readAsDataURL(file);
    });

  const uploadProofImage = async (
    dataUrl
  ) => {
    setIsUploadingProof(true);
    setProofError("");

    try {
      const response = await api.put(
        `/payments/public/student/${studentId}/proof`,
        { proofImage: dataUrl }
      );

      setProofImage(
        response.data
          ?.paymentProofImage ||
          dataUrl
      );

      setProofUploadedAt(
        response.data
          ?.paymentProofUploadedAt ||
          new Date().toISOString()
      );

      toast.success(
        "Payment screenshot uploaded successfully"
      );
    } catch (err) {
      const message =
        err.response?.data
          ?.message ||
        "Failed to upload payment screenshot";

      setProofError(message);
      toast.error(message);
    } finally {
      setIsUploadingProof(false);
    }
  };

  const handleProofFileChange = async (
    event
  ) => {
    const file =
      event.target.files?.[0];

    event.target.value = "";

    if (!file) {
      return;
    }

    if (
      !file.type.startsWith("image/")
    ) {
      const message =
        "Please select a valid image file";

      setProofError(message);
      toast.error(message);
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      const message =
        "Image is too large. Please select a file under 8MB";

      setProofError(message);
      toast.error(message);
      return;
    }

    try {
      const compressed =
        await compressProofImage(
          file
        );

      await uploadProofImage(
        compressed
      );
    } catch (err) {
      const message =
        err.message ||
        "Unable to process the selected image";

      setProofError(message);
      toast.error(message);
    }
  };

  const openProofFilePicker = () => {
    proofFileInputRef.current?.click();
  };

  const handleRemoveProofImage =
    async () => {
      setIsRemovingProof(true);
      setProofError("");

      try {
        await api.put(
          `/payments/public/student/${studentId}/proof`,
          { proofImage: "" }
        );

        setProofImage("");
        setProofUploadedAt(null);

        toast.success(
          "Payment screenshot removed"
        );
      } catch (err) {
        const message =
          err.response?.data
            ?.message ||
          "Failed to remove payment screenshot";

        setProofError(message);
        toast.error(message);
      } finally {
        setIsRemovingProof(false);
      }
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
    const query =
      buildUpiQuery();

    if (!query) {
      showPaymentError();
      return;
    }

    window.location.href =
      `gpay://upi/pay?${query}`;
  };

  const openPhonePe = () => {
    const query =
      buildUpiQuery();

    if (!query) {
      showPaymentError();
      return;
    }

    window.location.href =
      `phonepe://pay?${query}`;
  };

  const openPaytm = () => {
    const query =
      buildUpiQuery();

    if (!query) {
      showPaymentError();
      return;
    }

    window.location.href =
      `paytmmp://pay?${query}`;
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

  if (
    error ||
    !student ||
    !payment
  ) {
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
    student.paymentStatus ===
    "paid";

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
            continue using your preferred UPI app
            or scan the payment QR.
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
          <>

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
              <>

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

                {payment.upiQrImage && (
                  <div className="student-payment-qr-section">

                    <div className="student-payment-qr-heading">
                      <span>
                        OR SCAN & PAY
                      </span>

                      <strong>
                        Scan using any UPI app
                      </strong>
                    </div>

                    <div className="student-payment-qr-box">
                      <img
                        src={payment.upiQrImage}
                        alt="The SK Learnings Payment QR"
                      />
                    </div>

                    <span className="student-payment-qr-caption">
                      Scan the QR and enter the
                      payment amount manually in
                      your UPI app.
                    </span>

                  </div>
                )}

              </>
            )}

          </section>

          <section className="payment-proof-card">

            <div className="payment-method-title">
              <div>
                <span>
                  PAYMENT PROOF
                </span>

                <h3>
                  Upload Payment Screenshot
                </h3>
              </div>

              <FiImage />
            </div>

            <p className="payment-proof-hint">
              After completing the payment, upload
              a screenshot of the transaction so
              the institute can verify it.
            </p>

            <input
              ref={proofFileInputRef}
              type="file"
              accept="image/*"
              className="payment-proof-file-input"
              onChange={handleProofFileChange}
            />

            {!proofImage ? (
              <button
                type="button"
                className="payment-proof-dropzone"
                onClick={openProofFilePicker}
                disabled={isUploadingProof}
              >
                {isUploadingProof ? (
                  <>
                    <FiLoader className="payment-proof-spin" />
                    <strong>Uploading...</strong>
                  </>
                ) : (
                  <>
                    <FiUploadCloud />
                    <strong>
                      Upload Payment Screenshot
                    </strong>
                    <span>
                      PNG or JPG, up to 8MB
                    </span>
                  </>
                )}
              </button>
            ) : (
              <div className="payment-proof-preview">
                <div className="payment-proof-preview-image">
                  <img
                    src={proofImage}
                    alt="Payment proof screenshot"
                  />
                </div>

                <div className="payment-proof-preview-meta">
                  <span className="payment-proof-uploaded-badge">
                    <FiCheckCircle />
                    Screenshot uploaded
                  </span>

                  {proofUploadedAt && (
                    <span className="payment-proof-uploaded-date">
                      {formatDate(proofUploadedAt)}
                    </span>
                  )}
                </div>

                <div className="payment-proof-actions">
                  <button
                    type="button"
                    className="payment-proof-action-btn"
                    onClick={openProofFilePicker}
                    disabled={
                      isUploadingProof ||
                      isRemovingProof
                    }
                  >
                    <FiRefreshCw />
                    {isUploadingProof
                      ? "Replacing..."
                      : "Replace"}
                  </button>

                  <button
                    type="button"
                    className="payment-proof-action-btn payment-proof-remove-btn"
                    onClick={handleRemoveProofImage}
                    disabled={
                      isUploadingProof ||
                      isRemovingProof
                    }
                  >
                    <FiTrash2 />
                    {isRemovingProof
                      ? "Removing..."
                      : "Remove"}
                  </button>
                </div>
              </div>
            )}

            {proofError && (
              <div className="payment-proof-error">
                {proofError}
              </div>
            )}

          </section>

          </>
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