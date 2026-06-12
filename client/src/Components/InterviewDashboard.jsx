// InterviewDashboard.jsx
import React, { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router";
import { Calendar, momentLocalizer } from "react-big-calendar";
import moment from "moment";
import axios from "axios";
import "react-big-calendar/lib/css/react-big-calendar.css";

const localizer = momentLocalizer(moment);

/* ---------- Small presentational helpers ---------- */
const SidebarItem = ({ label, active, onClick, icon }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-3 w-full text-left px-4 py-3 rounded-lg hover:bg-gray-100 transition ${
      active ? "bg-blue-50 text-blue-600 font-semibold" : "text-gray-600"
    }`}
    type="button"
  >
    {icon}
    <span>{label}</span>
  </button>
);

const Card = ({ children, className = "" }) => (
  <div className={`bg-white shadow-sm rounded-lg p-6 ${className}`}>{children}</div>
);

const FormField = ({ label, children }) => (
  <div className="mb-4">
    <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
    {children}
  </div>
);

/* ---------- Utility helpers ---------- */
const generateId = (prefix = "") => `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

const IconCalendar = (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3M3 11h18M5 21h14a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2z" /></svg>
);
const IconPeople = (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 0 0-4-4h-1M9 20H4v-2a4 4 0 0 1 4-4h1M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" /></svg>
);
const IconPlus = (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
);

/* ---------- Main component ---------- */
const InterviewDashboard = ({
  currentUser = null,    // { id: string, email?: string } - provided by parent/auth context
  apiBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000",      // base path for backend; will call `${apiBase}/interviews` etc.
  fetchInitial = false   // if true, fetch initial interviewers and interviewSpaces
}) => {
  const navigate = useNavigate();

  // remote data (empty by default — no hardcoded demo data)
  const [interviewers, setInterviewers] = useState([]);
  const [upcomingSpaces, setUpcomingSpaces] = useState([]);

  // UI state
  const [activeTab, setActiveTab] = useState("schedule");
  const [isScheduling, setIsScheduling] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // form state (matches InterviewSpace schema)
  const [newInterviewer, setNewInterviewer] = useState({ name: "", email: "" });
  const [newSpace, setNewSpace] = useState({
    title: "",
    scheduledAt: "",
    candidateId: "",
    candidateEmail: "",
    invitedInterviewers: [], // [{ userId, email }]
    dsaQuestions: [],         // { title, description, difficulty, testCases: [{input}], externalId }
    videoRoomId: "",
    codeRoomId: "",
    whiteBoardRoom: ""
  });

  // builder for a single question
  const [newQuestion, setNewQuestion] = useState({
    title: "",
    description: "",
    difficulty: "easy",
    testCases: [{ input: "" }],
    externalId: ""
  });

  /* ---------- Optional: fetch initial data ---------- */
  useEffect(() => {
    let canceled = false;
    if (!fetchInitial) return;

    const instance = axios.create({ baseURL: apiBase, timeout: 30_000 });

    const load = async () => {
      try {
        const [usersRes, interviewsRes] = await Promise.all([
          instance.get("/interview-create/users").catch(() => ({ data: [] })),       // optional endpoint
          instance.get("/interview-create/interviews").catch(() => ({ data: [] }))   // optional endpoint
        ]);

        if (canceled) return;
        setInterviewers(Array.isArray(usersRes.data) ? usersRes.data : []);
        setUpcomingSpaces(Array.isArray(interviewsRes.data) ? interviewsRes.data : []);
      } catch (err) {
        console.warn("Initial fetch failed:", err?.message || err);
      }
    };

    load();
    return () => { canceled = true; };
  }, [fetchInitial, apiBase]);

  /* ---------- Calendar events derived from upcomingSpaces ---------- */
  const events = useMemo(
    () =>
      upcomingSpaces.map((space) => {
        const start = space.scheduledAt ? new Date(space.scheduledAt) : new Date();
        const end = new Date(start.getTime() + (space.durationMinutes || 60) * 60000);
        return {
          id: space._id || space.id || generateId("space_"),
          title: `${space.title} — ${space.candidateEmail || ""}`,
          start,
          end,
          raw: space
        };
      }),
    [upcomingSpaces]
  );

  /* ---------- Basic client-side handlers ---------- */
  const handleAddInterviewer = () => {
    setError(null);
    if (!newInterviewer.name || !newInterviewer.email) {
      setError("Interviewer name and email are required.");
      return;
    }
    const created = { id: generateId("u_"), ...newInterviewer };
    setInterviewers((prev) => [...prev, created]);
    setNewInterviewer({ name: "", email: "" });
    setSuccessMessage("Interviewer added locally. Persist via API if needed.");
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleAddQuestionTestCase = () => {
    setNewQuestion((prev) => ({ ...prev, testCases: [...prev.testCases, { input: "" }] }));
  };

  const handleQuestionTestCaseChange = (idx, value) => {
    setNewQuestion((prev) => {
      const tcs = [...prev.testCases];
      tcs[idx] = { input: value };
      return { ...prev, testCases: tcs };
    });
  };

  const handleAddQuestion = () => {
    setError(null);
    if (!newQuestion.title || !newQuestion.description) {
      setError("Question title and description are required.");
      return;
    }
    const q = { ...newQuestion, id: generateId("q_") };
    setNewSpace((prev) => ({ ...prev, dsaQuestions: [...prev.dsaQuestions, q] }));
    setNewQuestion({ title: "", description: "", difficulty: "easy", testCases: [{ input: "" }], externalId: "" });
    setSuccessMessage("Question added to the set.");
    setTimeout(() => setSuccessMessage(null), 2500);
  };

  const handleAddInvitedInterviewer = (userId) => {
    setError(null);
    const user = interviewers.find((u) => u.id === userId || u._id === userId);
    if (!user) {
      setError("Selected interviewer not found.");
      return;
    }
    setNewSpace((prev) => {
      if (prev.invitedInterviewers.some((inv) => inv.userId === (user.id || user._id))) return prev;
      return { ...prev, invitedInterviewers: [...prev.invitedInterviewers, { userId: user.id || user._id, email: user.email }] };
    });
  };

  const handleRemoveInvited = (index) => {
    setNewSpace((prev) => ({ ...prev, invitedInterviewers: prev.invitedInterviewers.filter((_, i) => i !== index) }));
  };

  /* ---------- API: schedule new interview space ---------- */
  const handleScheduleSpace = async () => {
    setError(null);
    setSuccessMessage(null);

    // basic validation
    if (!newSpace.title || !newSpace.scheduledAt || !newSpace.candidateEmail) {
      setError("Please fill interview title, date/time and candidate email.");
      return;
    }

    if (!currentUser || (!currentUser.id && !currentUser._id)) {
      setError("currentUser is required to set ownerId. Provide currentUser prop.");
      return;
    }

    setIsScheduling(true);

    try {
      const payload = {
        ownerId: currentUser.id || currentUser._id,
        title: newSpace.title,
        scheduledAt: newSpace.scheduledAt,
        candidateId: newSpace.candidateId || null,
        candidateEmail: newSpace.candidateEmail,
        invitedInterviewers: newSpace.invitedInterviewers.map((inv) => ({ userId: inv.userId, email: inv.email })),
        dsaQuestions: newSpace.dsaQuestions.map((q) => ({
          title: q.title,
          description: q.description,
          difficulty: q.difficulty,
          testCases: Array.isArray(q.testCases) ? q.testCases.map(tc => ({ input: tc.input })) : [],
          externalId: q.externalId || ""
        })),
        // Do not send room ids; backend will generate them
      };

      const instance = axios.create({ baseURL: apiBase, timeout: 120_000 });
      const response = await instance.post("/interview-create", payload);

      // server expected to return { success: true, interviewSpace } or created document
      const data = response.data;
      const created = data?.interviewSpace || data?.interviewSpace || data;

      if (!created || (!created._id && !created.id)) {
        throw new Error(data?.error || "Unexpected server response");
      }

      // append to local state and normalize scheduledAt to Date
      const normalized = {
        ...created,
        scheduledAt: created.scheduledAt ? new Date(created.scheduledAt) : new Date(newSpace.scheduledAt)
      };
      setUpcomingSpaces((prev) => [...prev, normalized]);

      // reset forms
      setNewSpace({
        title: "",
        scheduledAt: "",
        candidateId: "",
        candidateEmail: "",
        invitedInterviewers: [],
        dsaQuestions: [],
        videoRoomId: "",
        codeRoomId: "",
        whiteBoardRoom: ""
      });
      setNewQuestion({ title: "", description: "", difficulty: "easy", testCases: [{ input: "" }], externalId: "" });
      setSuccessMessage("Interview scheduled successfully.");
      setActiveTab("upcoming");
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || "Failed to schedule interview";
      setError(msg);
      console.error("Schedule error:", err);
    } finally {
      setIsScheduling(false);
      setTimeout(() => setSuccessMessage(null), 3000);
    }
  };

  /* ---------- Simple UI render ---------- */
  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-72 bg-white border-r hidden md:block">
        <div className="px-6 py-6 border-b">
          <h2 className="text-lg font-bold text-gray-900">Interview Suite</h2>
          <p className="text-xs text-gray-500 mt-1">Manage interviews, interviewers and DSA sets</p>
        </div>

        <nav className="p-4 space-y-2">
          <SidebarItem label="Schedule Interview" active={activeTab === "schedule"} onClick={() => setActiveTab("schedule")} icon={IconPlus} />
          <SidebarItem label="Upcoming Interviews" active={activeTab === "upcoming"} onClick={() => setActiveTab("upcoming")} icon={IconCalendar} />
          <SidebarItem label="Interviewers" active={activeTab === "interviewers"} onClick={() => setActiveTab("interviewers")} icon={IconPeople} />
        </nav>

        <div className="mt-auto p-4 text-xs text-gray-500">
          <div>Version 1.0</div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1">
        <header className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-semibold text-gray-900">Interview Dashboard</h1>
              <span className="text-sm text-gray-500 hidden sm:inline">— scheduling & DSA management</span>
            </div>

            <div className="flex items-center gap-3">
              <button onClick={() => setActiveTab("schedule")} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-md text-sm">Schedule</button>
              <button onClick={() => setActiveTab("upcoming")} className="bg-gray-50 hover:bg-gray-100 text-gray-700 px-3 py-2 rounded-md text-sm">View Calendar</button>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto p-6">
          {/* Error / Success */}
          {error && <div className="mb-4 text-red-600">{error}</div>}
          {successMessage && <div className="mb-4 text-green-600">{successMessage}</div>}

          {/* Schedule */}
          {activeTab === "schedule" && (
            <Card>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h2 className="text-lg font-semibold mb-4">Schedule New Interview</h2>

                  <FormField label="Interview Title">
                    <input type="text" className="w-full px-3 py-2 border rounded-md" value={newSpace.title} onChange={(e) => setNewSpace({ ...newSpace, title: e.target.value })} />
                  </FormField>

                  <FormField label="Candidate Email">
                    <input type="email" className="w-full px-3 py-2 border rounded-md" value={newSpace.candidateEmail} onChange={(e) => setNewSpace({ ...newSpace, candidateEmail: e.target.value })} />
                  </FormField>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField label="Candidate ID (optional)">
                      <input type="text" className="w-full px-3 py-2 border rounded-md" value={newSpace.candidateId} onChange={(e) => setNewSpace({ ...newSpace, candidateId: e.target.value })} />
                    </FormField>

                    <FormField label="Date & Time">
                      <input type="datetime-local" className="w-full px-3 py-2 border rounded-md" value={newSpace.scheduledAt} onChange={(e) => setNewSpace({ ...newSpace, scheduledAt: e.target.value })} />
                    </FormField>
                  </div>

                  <FormField label="Invite Interviewer (from list)">
                    <select className="w-full px-3 py-2 border rounded-md" onChange={(e) => handleAddInvitedInterviewer(e.target.value)} defaultValue="">
                      <option value="">Select interviewer to invite</option>
                      {interviewers.map((iv) => <option key={iv.id || iv._id} value={iv.id || iv._id}>{iv.name} ({iv.email})</option>)}
                    </select>

                    {newSpace.invitedInterviewers.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {newSpace.invitedInterviewers.map((inv, idx) => (
                          <div key={idx} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                            <div className="text-sm">{inv.email} <span className="text-xs text-gray-400 ml-2">({inv.userId})</span></div>
                            <button className="text-red-600 text-sm" onClick={() => handleRemoveInvited(idx)}>Remove</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </FormField>

                  <div className="mt-4 flex items-center gap-3">
                    <button onClick={handleScheduleSpace} disabled={!newSpace.title || !newSpace.scheduledAt || !newSpace.candidateEmail || isScheduling} className="bg-green-600 disabled:opacity-60 hover:bg-green-700 text-white px-4 py-2 rounded-md">
                      {isScheduling ? "Scheduling..." : "Schedule Interview"}
                    </button>

                    <button onClick={() => {
                      setNewSpace({ title: "", scheduledAt: "", candidateId: "", candidateEmail: "", invitedInterviewers: [], dsaQuestions: [], videoRoomId: "", codeRoomId: "", whiteBoardRoom: "" });
                      setNewQuestion({ title: "", description: "", difficulty: "easy", testCases: [{ input: "" }], externalId: "" });
                      setError(null);
                      setSuccessMessage(null);
                    }} className="text-sm text-gray-600 hover:underline">
                      Reset Form
                    </button>
                  </div>
                </div>

                {/* DSA Problem builder */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">DSA Problem Set</h3>

                  {newSpace.dsaQuestions.length > 0 && (
                    <div className="mb-4 space-y-2">
                      {newSpace.dsaQuestions.map((p) => (
                        <div key={p.id} className="border rounded-md p-3 flex justify-between items-start">
                          <div>
                            <div className="font-medium">{p.title}</div>
                            <div className="text-xs mt-1 text-gray-500">{p.difficulty} • {p.testCases?.length || 0} test case(s)</div>
                            <div className="text-xs text-gray-600 mt-1">{p.description}</div>
                          </div>
                          <div>
                            <button className="text-red-600 hover:text-red-800 text-sm" onClick={() => setNewSpace((prev) => ({ ...prev, dsaQuestions: prev.dsaQuestions.filter(x => x.id !== p.id) }))}>Remove</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <Card className="mt-2">
                    <h4 className="font-medium mb-3">Add Problem</h4>

                    <FormField label="Title">
                      <input type="text" className="w-full px-3 py-2 border rounded-md" value={newQuestion.title} onChange={(e) => setNewQuestion({ ...newQuestion, title: e.target.value })} />
                    </FormField>

                    <FormField label="Description">
                      <textarea className="w-full px-3 py-2 border rounded-md" value={newQuestion.description} onChange={(e) => setNewQuestion({ ...newQuestion, description: e.target.value })} />
                    </FormField>

                    <FormField label="Difficulty">
                      <select className="w-full px-3 py-2 border rounded-md" value={newQuestion.difficulty} onChange={(e) => setNewQuestion({ ...newQuestion, difficulty: e.target.value })}>
                        <option value="easy">easy</option>
                        <option value="medium">medium</option>
                        <option value="hard">hard</option>
                      </select>
                    </FormField>

                    <div className="mb-3">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Test Cases (input only)</label>
                      {newQuestion.testCases.map((tc, idx) => (
                        <div key={idx} className="mb-2">
                          <input placeholder="Input" value={tc.input} onChange={(e) => handleQuestionTestCaseChange(idx, e.target.value)} className="w-full px-3 py-2 border rounded-md" />
                        </div>
                      ))}
                      <button onClick={handleAddQuestionTestCase} className="text-sm text-blue-600 hover:underline flex items-center gap-2">{IconPlus} Add Test Case</button>
                    </div>

                    <div className="flex gap-2 mt-2">
                      <button onClick={handleAddQuestion} disabled={!newQuestion.title || !newQuestion.description} className="bg-blue-600 disabled:opacity-60 hover:bg-blue-700 text-white px-3 py-2 rounded-md">Add to Set</button>
                      <button onClick={() => setNewQuestion({ title: "", description: "", difficulty: "easy", testCases: [{ input: "" }], externalId: "" })} className="px-3 py-2 rounded-md border text-sm">Clear</button>
                    </div>
                  </Card>
                </div>
              </div>
            </Card>
          )}

          {/* Upcoming */}
          {activeTab === "upcoming" && (
            <div className="space-y-6">
              <Card>
                <h2 className="text-lg font-semibold mb-4">Calendar</h2>
                <div style={{ height: 450 }}>
                  <Calendar localizer={localizer} events={events} startAccessor="start" endAccessor="end" onSelectEvent={(event) => {
                    const space = upcomingSpaces.find((s) => (s._id || s.id) === (event.id));
                    if (space) navigate(`/interview/${space._id || space.id}`);
                  }} />
                </div>
              </Card>

              <Card>
                <h2 className="text-lg font-semibold mb-4">Upcoming Interviews</h2>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Candidate Email</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Interviewers</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date & Time</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {upcomingSpaces.map((s) => (
                        <tr key={s._id || s.id}>
                          <td className="px-4 py-3">{s.title}</td>
                          <td className="px-4 py-3">{s.candidateEmail}</td>
                          <td className="px-4 py-3">{(s.invitedInterviewers || []).map((inv) => inv.email).join(", ")}</td>
                          <td className="px-4 py-3">{s.scheduledAt ? moment(s.scheduledAt).format("MMM D, YYYY h:mm A") : "-"}</td>
                          <td className="px-4 py-3">
                            <button onClick={() => navigate(`/interview/${s._id || s.id}`)} className="text-blue-600 hover:underline mr-3">View</button>
                            <button onClick={() => setUpcomingSpaces((prev) => prev.filter(x => (x._id || x.id) !== (s._id || s.id)))} className="text-red-600 hover:underline">Cancel</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}

          {/* Interviewers */}
          {activeTab === "interviewers" && (
            <Card>
              <h2 className="text-lg font-semibold mb-4">Interviewers</h2>

              <div className="grid md:grid-cols-2 gap-6 mb-6">
                <div>
                  <h3 className="font-medium mb-2">Add New Interviewer</h3>
                  <FormField label="Name">
                    <input className="w-full px-3 py-2 border rounded-md" value={newInterviewer.name} onChange={(e) => setNewInterviewer({ ...newInterviewer, name: e.target.value })} />
                  </FormField>
                  <FormField label="Email">
                    <input className="w-full px-3 py-2 border rounded-md" value={newInterviewer.email} onChange={(e) => setNewInterviewer({ ...newInterviewer, email: e.target.value })} />
                  </FormField>
                  <div className="flex gap-3">
                    <button onClick={handleAddInterviewer} disabled={!newInterviewer.name || !newInterviewer.email} className="bg-blue-600 disabled:opacity-60 hover:bg-blue-700 text-white px-4 py-2 rounded-md">Add</button>
                    <button onClick={() => setNewInterviewer({ name: "", email: "" })} className="px-4 py-2 rounded-md border">Reset</button>
                  </div>
                </div>

                <div>
                  <h3 className="font-medium mb-2">Current Interviewers</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {interviewers.map((iv) => (
                          <tr key={iv.id || iv._id}>
                            <td className="px-4 py-3">{iv.name}</td>
                            <td className="px-4 py-3">{iv.email}</td>
                            <td className="px-4 py-3">
                              <button onClick={() => setInterviewers((prev) => prev.filter(x => (x.id || x._id) !== (iv.id || iv._id)))} className="text-red-600 hover:underline">Remove</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </Card>
          )}
        </main>
      </div>
    </div>
  );
};

export default InterviewDashboard;
