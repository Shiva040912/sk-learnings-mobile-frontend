import { useEffect, useRef, useState } from "react";
import {
  FiBookOpen,
  FiCalendar,
  FiCreditCard,
  FiPlus,
  FiSave,
  FiTrash2,
  FiUpload,
} from "react-icons/fi";
import toast from "react-hot-toast";
import api from "../services/axios";
import "../styles/settings.css";

const toInputDate = (date) =>
  date ? new Date(date).toISOString().slice(0, 10) : "";

const isoToDisplay = (iso) => {
  if (!iso) return "";
  const [year, month, day] = iso.split("-");
  return `${day}/${month}/${year}`;
};

const displayToIso = (display) => {
  const match = display.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;
  const [, day, month, year] = match;
  const date = new Date(`${year}-${month}-${day}`);
  if (
    date.getFullYear() != year ||
    date.getMonth() + 1 != month ||
    date.getDate() != day
  )
    return null;
  return `${year}-${month}-${day}`;
};

const formatDateInput = (raw) => {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
};

const Settings = () => {
  const [section, setSection] = useState("course");
  const [courses, setCourses] = useState([]);
  const [batches, setBatches] = useState([]);
  const [courseName, setCourseName] = useState("");
  const [batch, setBatch] = useState({
    batchName: "",
    startTime: "",
    endTime: "",
  });
  const [payment, setPayment] = useState({
    upiId: "",
    receiverName: "",
    paymentPhone: "",
    upiQrImage: "",
  });
  const [reminders, setReminders] = useState({
    feeDueDate: "",
    preventReminderDate: "",
    overdueReminderDate: "",
  });
  const [reminderDrafts, setReminderDrafts] = useState({
    feeDueDate: "",
    preventReminderDate: "",
    overdueReminderDate: "",
  });
  const [saving, setSaving] = useState(false);
  const dateInputRefs = useRef({});

  const loadSettings = async () => {
    try {
      const [courseRes, batchRes, paymentRes] = await Promise.all([
        api.get("/academic/courses"),
        api.get("/academic/batches"),
        api.get("/payments/settings"),
      ]);
      setCourses(courseRes.data || []);
      setBatches(batchRes.data || []);
      const data = paymentRes.data || {};
      setPayment({
        upiId: data.upiId || "",
        receiverName: data.receiverName || "",
        paymentPhone: data.paymentPhone || "",
        upiQrImage: data.upiQrImage || "",
      });
      const nextReminders = {
        feeDueDate: toInputDate(data.feeDueDate),
        preventReminderDate: toInputDate(data.preventReminderDate),
        overdueReminderDate: toInputDate(data.overdueReminderDate),
      };
      setReminders(nextReminders);
      setReminderDrafts({
        feeDueDate: isoToDisplay(nextReminders.feeDueDate),
        preventReminderDate: isoToDisplay(nextReminders.preventReminderDate),
        overdueReminderDate: isoToDisplay(nextReminders.overdueReminderDate),
      });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load settings");
    }
  };
  useEffect(() => {
    loadSettings();
  }, []);

  const addCourse = async () => {
    if (!courseName.trim()) return toast.error("Enter a course name");
    try {
      await api.post("/academic/courses", { courseName: courseName.trim() });
      setCourseName("");
      await loadSettings();
      toast.success("Course added");
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to add course");
    }
  };
  const addBatch = async () => {
    if (
      !batch.batchName.trim() ||
      !batch.startTime.trim() ||
      !batch.endTime.trim()
    )
      return toast.error("Enter batch name, start time and end time");
    try {
      await api.post("/academic/batches", batch);
      setBatch({ batchName: "", startTime: "", endTime: "" });
      await loadSettings();
      toast.success("Batch added");
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to add batch");
    }
  };
  const deleteItem = async (kind, id) => {
    try {
      await api.delete(`/academic/${kind}/${id}`);
      await loadSettings();
      toast.success(`${kind === "courses" ? "Course" : "Batch"} removed`);
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to remove item");
    }
  };
  const savePayment = async () => {
    if (
      !payment.upiId.trim() ||
      !payment.receiverName.trim() ||
      !payment.paymentPhone.trim()
    )
      return toast.error("Complete the UPI payment details");
    try {
      setSaving(true);
      await api.put("/payments/settings", payment);
      toast.success("Payment settings saved");
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Unable to save payment settings",
      );
    } finally {
      setSaving(false);
    }
  };
  const saveReminders = async () => {
    if (!reminders.feeDueDate) return toast.error("Select the payment date");
    try {
      setSaving(true);
      await api.put("/payments/reminder-dates", reminders);
      toast.success("Reminder dates saved");
      await loadSettings();
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Unable to save reminder dates",
      );
    } finally {
      setSaving(false);
    }
  };
  const uploadQr = (event) => {
    const file = event.target.files?.[0];
    if (!file || !file.type.startsWith("image/"))
      return toast.error("Choose an image file for the QR code");
    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        const size = 320;
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        canvas.width = size;
        canvas.height = size;
        context.fillStyle = "#fff";
        context.fillRect(0, 0, size, size);
        const scale = Math.min(size / image.width, size / image.height);
        const width = image.width * scale;
        const height = image.height * scale;
        context.drawImage(
          image,
          (size - width) / 2,
          (size - height) / 2,
          width,
          height,
        );
        setPayment((current) => ({
          ...current,
          upiQrImage: canvas.toDataURL("image/jpeg", 0.78),
        }));
        toast.success("QR image ready to save");
      };
      image.src = String(reader.result || "");
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  };
  const navItems = [
    { id: "course", label: "Course", icon: <FiBookOpen /> },
    { id: "payment", label: "Payment", icon: <FiCreditCard /> },
    { id: "reminders", label: "Reminders", icon: <FiCalendar /> },
  ];

  const openDatePicker = (key) => {
    const el = dateInputRefs.current[key];
    if (!el) return;
    if (typeof el.showPicker === "function") el.showPicker();
    else el.focus();
  };

  const onNativeDateChange = (key, value) => {
    setReminders({ ...reminders, [key]: value });
    setReminderDrafts({ ...reminderDrafts, [key]: isoToDisplay(value) });
  };

  const onTypedDateChange = (key, raw) => {
    const formatted = formatDateInput(raw);
    setReminderDrafts({ ...reminderDrafts, [key]: formatted });
    const iso = displayToIso(formatted);
    if (iso) setReminders({ ...reminders, [key]: iso });
  };

  return (
    <div className="settings-page">
      <div className="settings-shell">
        <aside className="settings-menu">
          {navItems.map((item) => (
            <button
              key={item.id}
              className={section === item.id ? "active" : ""}
              onClick={() => setSection(item.id)}
            >
              <span>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </aside>
        <main className="settings-content">
          {section === "course" && (
            <section className="settings-panel">
              <header>
                <h2>Course & Batch</h2>
                <p>Courses and batch timings for student entry.</p>
              </header>
              <div className="settings-two-column">
                <div>
                  <h3>Courses</h3>
                  <div className="settings-add-row">
                    <input
                      value={courseName}
                      onChange={(e) => setCourseName(e.target.value)}
                      placeholder="Course name"
                    />
                    <button onClick={addCourse}>
                      <FiPlus /> Add
                    </button>
                  </div>
                  <div className="settings-list">
                    {courses.length ? (
                      courses.map((item) => (
                        <div key={item._id} className="settings-list-item">
                          <strong>{item.courseName}</strong>
                          <button
                            onClick={() => deleteItem("courses", item._id)}
                            aria-label="Remove course"
                          >
                            <FiTrash2 />
                          </button>
                        </div>
                      ))
                    ) : (
                      <p className="settings-empty">No courses added.</p>
                    )}
                  </div>
                </div>
                <div>
                  <h3>Batch timings</h3>
                  <div className="settings-batch-form">
                    <input
                      value={batch.batchName}
                      onChange={(e) =>
                        setBatch({ ...batch, batchName: e.target.value })
                      }
                      placeholder="Batch name"
                    />
                    <input
                      value={batch.startTime}
                      onChange={(e) =>
                        setBatch({ ...batch, startTime: e.target.value })
                      }
                      placeholder="Start: 10:00 AM"
                    />
                    <input
                      value={batch.endTime}
                      onChange={(e) =>
                        setBatch({ ...batch, endTime: e.target.value })
                      }
                      placeholder="End: 11:00 AM"
                    />
                    <button onClick={addBatch}>
                      <FiPlus /> Add batch
                    </button>
                  </div>
                  <div className="settings-list">
                    {batches.length ? (
                      batches.map((item) => (
                        <div key={item._id} className="settings-list-item">
                          <span>
                            <strong>{item.batchName}</strong>
                            <small>
                              {item.startTime} – {item.endTime}
                            </small>
                          </span>
                          <button
                            onClick={() => deleteItem("batches", item._id)}
                            aria-label="Remove batch"
                          >
                            <FiTrash2 />
                          </button>
                        </div>
                      ))
                    ) : (
                      <p className="settings-empty">No batches added.</p>
                    )}
                  </div>
                </div>
              </div>
            </section>
          )}
          {section === "payment" && (
            <section className="settings-panel">
              <header>
                <h2>Payment</h2>
                <p>UPI details shown on the student payment page.</p>
              </header>
              <div className="settings-form-grid">
                <label>
                  UPI ID
                  <input
                    value={payment.upiId}
                    onChange={(e) =>
                      setPayment({ ...payment, upiId: e.target.value })
                    }
                    placeholder="example@upi"
                  />
                </label>
                <label>
                  Receiver name
                  <input
                    value={payment.receiverName}
                    onChange={(e) =>
                      setPayment({ ...payment, receiverName: e.target.value })
                    }
                    placeholder="The SK Learnings"
                  />
                </label>
                <label>
                  Payment phone
                  <input
                    value={payment.paymentPhone}
                    onChange={(e) =>
                      setPayment({ ...payment, paymentPhone: e.target.value })
                    }
                    placeholder="10 digit mobile number"
                  />
                </label>
                <div className="qr-upload">
                  <span>Payment QR code</span>
                  <label className="upload-control">
                    <FiUpload /> Upload QR
                    <input type="file" accept="image/*" onChange={uploadQr} />
                  </label>
                  {payment.upiQrImage && (
                    <div className="qr-preview">
                      <img src={payment.upiQrImage} alt="Payment QR" />
                      <button
                        onClick={() =>
                          setPayment({ ...payment, upiQrImage: "" })
                        }
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <button
                className="settings-save"
                onClick={savePayment}
                disabled={saving}
              >
                <FiSave /> {saving ? "Saving..." : "Save payment"}
              </button>
            </section>
          )}
          {section === "reminders" && (
            <section className="settings-panel">
              <header>
                <h2>Reminders</h2>
                <p>Messages go only to unpaid students on the selected date.</p>
              </header>
              <div className="reminder-grid">
                {[
                  ["feeDueDate", "Payment Date", "Final payment date."],
                  [
                    "preventReminderDate",
                    "Prevent Message Date",
                    "Reminder before payment date.",
                  ],
                  [
                    "overdueReminderDate",
                    "Overdue Message Date",
                    "Reminder after payment date.",
                  ],
                ].map(([key, label, description]) => (
                  <label key={key}>
                    <strong>{label}</strong>
                    <span>{description}</span>
                    <div className="date-field">
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="DD/MM/YYYY"
                        maxLength={10}
                        value={reminderDrafts[key]}
                        onChange={(e) => onTypedDateChange(key, e.target.value)}
                      />
                      <button
                        type="button"
                        className="date-icon-btn"
                        onClick={() => openDatePicker(key)}
                        aria-label="Open calendar"
                      >
                        <FiCalendar />
                      </button>
                      <input
                        type="date"
                        ref={(el) => (dateInputRefs.current[key] = el)}
                        className="date-native-hidden"
                        value={reminders[key]}
                        onChange={(e) =>
                          onNativeDateChange(key, e.target.value)
                        }
                        tabIndex={-1}
                      />
                    </div>
                  </label>
                ))}
              </div>
              <button
                className="settings-save"
                onClick={saveReminders}
                disabled={saving}
              >
                <FiSave /> {saving ? "Saving..." : "Save dates"}
              </button>
            </section>
          )}
        </main>
      </div>
    </div>
  );
};
export default Settings;
