// src/Components/Dashboard.jsx
import React, { useContext, useState } from "react";
import { FaBars, FaSignOutAlt, FaPlay, FaUserFriends, FaClock, FaPlus, FaTimes } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router";
import UserContext from "../context/UserContext";
import CodeEditor from "./CodeEditor";
import { useFirebase } from "../FireBase/FireBaseAuth";
import { auth } from "../FireBase/FireBaseAuth";
import { Link } from "react-router";

const CodePlayback = () => {
    return (
        <div className="flex-1 flex items-center justify-center">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="text-center p-8"
            >
                <div className="text-5xl mb-4 text-gray-400">
                    <FaClock />
                </div>
                <h2 className="text-2xl font-bold text-gray-300 mb-2">Code Playback</h2>
                <p className="text-gray-500 max-w-md">
                    This page is intentionally left blank. Code playback functionality will be implemented here.
                </p>
            </motion.div>
        </div>
    );
};

const Dashboard = () => {
    const { signOut } = useFirebase();
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [activeTab, setActiveTab] = useState("interview");
    const [joinCode, setJoinCode] = useState("");
    const [joinMessage, setJoinMessage] = useState(null);
    const [prompt, setPrompt] = useState("");
    const [promptSaved, setPromptSaved] = useState(null);

    // Meeting scheduler UI state
    const [meetingId, setMeetingId] = useState(null);
    const [schedulingError, setSchedulingError] = useState(null);
    const [isScheduling, setIsScheduling] = useState(false);

    const { user } = useContext(UserContext);

    // console.log(user);
    
    const navigate = useNavigate();

    // -------------------------
    // User-provided scheduling function placeholder
    // -------------------------
    /**
     * handleScheduleMeeting - placeholder for scheduling logic
     *
     * You should implement the actual scheduling logic here (call backend, create meeting record, etc).
     * The function should return a string meeting id (or throw an error).
     *
     * Example usage inside the placeholder:
     *   // call your API -> const id = await api.scheduleMeeting(payload);
     *   // return id;
     */
    const handleScheduleMeeting = async (meetingOptions = {}) => {
        // ---------- YOUR LOGIC GOES HERE ----------
        // Example stub: make a unique id locally (demo only)
        // Replace this with your server call or custom generation logic.
        const id = `${Date.now().toString(36)}-${Math.floor(Math.random() * 0xffff).toString(16)}`;
        // Return the created meeting id (or throw an Error on failure)
        return id;
        // ---------- END OF PLACEHOLDER ----------
    };

    // Called by the Start button in the Schedule Meeting card
    const onStartScheduleClick = async (e) => {
        e.preventDefault();
        setSchedulingError(null);
        setIsScheduling(true);
        setMeetingId(null);

        try {
            // Pass any options you want to handleScheduleMeeting as an object
            const options = {
                prompt, // example: include current prompt if you want
                organizer: user?.email,
                createdAt: new Date().toISOString(),
            };

            const id = await handleScheduleMeeting(options);

            if (!id) {
                throw new Error("Scheduling did not return an ID");
            }

            setMeetingId(id);

            // OPTIONAL: auto-navigate to the room. Uncomment if desired.
            // navigate(`/room/${encodeURIComponent(id)}?userId=${encodeURIComponent(user?.email || "")}&role=interviewer`);

        } catch (err) {
            setSchedulingError(err?.message || String(err));
        } finally {
            setIsScheduling(false);
        }
    };

    const handleJoinInterview = async (e) => {
        e.preventDefault();
        if (!joinCode.trim()) {
            setJoinMessage({ type: "error", text: "Please enter an interview code." });
            return;
        }
        navigate(`/room/${encodeURIComponent(joinCode.trim())}?userId=${encodeURIComponent(user?.email || "")}&role=candidate`);
        setJoinMessage({ type: "success", text: `Joined interview with code: ${joinCode.trim()}` });
        setJoinCode("");
    };

    const handleStartInterview = (e) => {
        e.preventDefault();
        if (!prompt.trim()) {
            setPromptSaved({ type: "error", text: "Please enter a prompt to start." });
            return;
        }
        const roomId = Math.floor(100000 + Math.random() * 900000);
        const params = new URLSearchParams({
            prompt,
            role: "interviewer",
        });
        navigate(`/test/${roomId}?${params.toString()}`);
        setPromptSaved({ type: "success", text: "Prompt saved. Interview ready to run." });
    };

    // Animation variants
    const sidebarVariants = { open: { width: "16rem" }, closed: { width: "4rem" } };
    const contentVariants = { open: { opacity: 1, x: 0 }, closed: { opacity: 0, x: -20 } };
    const cardVariants = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } };

    return (
        <div className="min-h-screen flex bg-gray-900 text-gray-200">
            {/* Sidebar */}
            <motion.aside
                initial={sidebarOpen ? "open" : "closed"}
                animate={sidebarOpen ? "open" : "closed"}
                variants={sidebarVariants}
                className="flex flex-col bg-gray-800 border-r border-gray-700 transition-all duration-300 ease-in-out"
            >
                <div className="flex items-center justify-between p-4 border-b border-gray-700">
                    <motion.div className="flex items-center gap-3" animate={sidebarOpen ? "open" : "closed"} variants={contentVariants}>
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-blue-600 to-blue-400 flex items-center justify-center text-white font-bold shadow-md">M</div>
                        {sidebarOpen && <span className="font-semibold text-blue-400">InterviewHub</span>}
                    </motion.div>

                    <button onClick={() => setSidebarOpen((s) => !s)} className="p-2 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-gray-200 transition-colors" aria-label="Toggle sidebar">
                        <FaBars />
                    </button>
                </div>

                <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
                    <motion.button onClick={() => setActiveTab("interview")} className={`w-full flex items-center gap-3 p-2 rounded-lg text-sm transition-colors ${activeTab === "interview" ? "bg-gray-700 text-blue-400" : "text-gray-400 hover:bg-gray-700 hover:text-gray-200"}`} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                        <div className="w-6 h-6 flex items-center justify-center"><FaUserFriends className={activeTab === "interview" ? "text-blue-400" : "text-gray-400"} /></div>
                        {sidebarOpen && <span>Interview</span>}
                    </motion.button>

                    <Link to={"/editor"}>
                    <motion.button onClick={() => setActiveTab("playback")} className={`w-full flex items-center gap-3 p-2 rounded-lg text-sm transition-colors ${activeTab === "playback" ? "bg-gray-700 text-purple-400" : "text-gray-400 hover:bg-gray-700 hover:text-gray-200"}`} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                        <div className="w-6 h-6 flex items-center justify-center"><FaClock className={activeTab === "playback" ? "text-purple-400" : "text-gray-400"} /></div>
                        {sidebarOpen && <span>Code Collab</span>}
                    </motion.button>
                    </Link>
                </nav>

                <div className="p-3 border-t border-gray-700">
                    <motion.button onClick={(e)=>{signOut(auth)}} className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-700 text-sm text-gray-400 hover:text-red-400 transition-colors" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                        <div className="w-6 h-6 flex items-center justify-center"><FaSignOutAlt /></div>
                        {sidebarOpen && <span onClick={(e) => { signOut}}>Logout</span>}
                    </motion.button>
                </div>
            </motion.aside>

            {/* Main area */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Navbar */}
                <motion.header className="flex items-center justify-between bg-gray-800 p-4 border-b border-gray-700" initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.3 }}>
                    <div>
                        <h1 className="text-xl font-bold text-gray-200">{activeTab === "interview" ? "Interview Dashboard" : "Code Playback"}</h1>
                        <p className="text-sm text-gray-500">{activeTab === "interview" ? "Join or conduct technical interviews" : "Review your coding sessions"}</p>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="text-sm text-gray-400 hidden md:block">Welcome, {user?.name || "Saish"}</div>
                        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="cursor-pointer">
                            <img src={ user.profilePic } alt="User avatar" className="w-9 h-9 rounded-full border-2 border-blue-800 shadow" />
                        </motion.div>
                    </div>
                </motion.header>

                {/* Content */}
                <main className="flex-1 overflow-auto bg-gray-900">
                    {activeTab === "interview" ? (
                        <div className="p-6">
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                {/* Join Interview */}
                                <motion.section id="join" className="bg-gray-800 rounded-xl p-6 border border-gray-700" initial="hidden" animate="visible" variants={cardVariants} transition={{ duration: 0.3, delay: 0.1 }}>
                                    <div className="flex items-center justify-between mb-6">
                                        <div>
                                            <h2 className="text-xl font-bold text-gray-200 flex items-center gap-2">
                                                <span className="p-2 bg-blue-900 rounded-lg text-blue-400"><FaUserFriends /></span>
                                                Join Interview
                                            </h2>
                                            <p className="text-sm text-gray-500 mt-1">Enter code from interviewer</p>
                                        </div>
                                        <motion.div whileHover={{ rotate: 90 }} className="text-gray-500 hover:text-gray-300 cursor-pointer" onClick={() => { setJoinCode(""); setJoinMessage(null); }}>
                                            <FaTimes />
                                        </motion.div>
                                    </div>

                                    <form onSubmit={handleJoinInterview} className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-400 mb-1">Interview Code</label>
                                            <motion.input type="text" value={joinCode} onChange={(e) => setJoinCode(e.target.value)} placeholder="e.g. ABCD-1234" className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-gray-200" aria-label="Interview code" />
                                        </div>

                                        <div className="flex items-center gap-3 pt-2">
                                            <motion.button type="submit" className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-lg text-sm font-medium hover:from-blue-700 hover:to-blue-600 shadow-md" whileHover={{ scale: 1.03, boxShadow: "0 4px 12px rgba(59, 130, 246, 0.3)" }} whileTap={{ scale: 0.98 }}>
                                                <FaPlay className="text-xs" /> Join Session
                                            </motion.button>

                                            <button type="button" onClick={() => { setJoinCode(""); setJoinMessage(null); }} className="px-4 py-2.5 border border-gray-600 rounded-lg text-sm font-medium text-gray-300 hover:bg-gray-700 transition-colors">Clear</button>
                                        </div>

                                        <AnimatePresence>
                                            {joinMessage && (
                                                <motion.div className={`text-sm mt-2 p-3 rounded-lg ${joinMessage.type === "success" ? "bg-green-900 text-green-400 border border-green-800" : "bg-red-900 text-red-400 border border-red-800"}`} role="status" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                                                    {joinMessage.text}
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </form>
                                </motion.section>

                                {/* Conduct Interview */}
                                <motion.section className="bg-gray-800 rounded-xl p-6 border border-gray-700" initial="hidden" animate="visible" variants={cardVariants} transition={{ duration: 0.3, delay: 0.2 }}>
                                    <div className="flex items-center justify-between mb-6">
                                        <div>
                                            <h2 className="text-xl font-bold text-gray-200 flex items-center gap-2">
                                                <span className="p-2 bg-green-900 rounded-lg text-green-400"><FaPlus /></span>
                                                Conduct Interview
                                            </h2>
                                            <p className="text-sm text-gray-500 mt-1">Create a new technical interview</p>
                                        </div>
                                        <motion.div whileHover={{ rotate: 90 }} className="text-gray-500 hover:text-gray-300 cursor-pointer" onClick={() => { setPrompt(""); setPromptSaved(null); }}>
                                            <FaTimes />
                                        </motion.div>
                                    </div>

                                    <form onSubmit={handleStartInterview} className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-400 mb-1">Interview Prompt</label>
                                            <motion.textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Example: Assess front-end skills — 3 questions..." rows={8} className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all text-gray-200" aria-label="Interview prompt" whileFocus={{ boxShadow: "0 0 0 2px rgba(16, 185, 129, 0.5)" }} />
                                        </div>

                                        <div className="flex items-center gap-3 pt-2">
                                            <motion.button type="submit" className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-green-600 to-green-500 text-white rounded-lg text-sm font-medium hover:from-green-700 hover:to-green-600 shadow-md" whileHover={{ scale: 1.03, boxShadow: "0 4px 12px rgba(16, 185, 129, 0.3)" }} whileTap={{ scale: 0.98 }}>
                                                <FaPlay className="text-xs" /> Start Code
                                            </motion.button>

                                            <button type="button" onClick={() => { setPrompt(""); setPromptSaved(null); }} className="px-4 py-2.5 border border-gray-600 rounded-lg text-sm font-medium text-gray-300 hover:bg-gray-700 transition-colors">Reset</button>
                                        </div>

                                        <AnimatePresence>
                                            {promptSaved && (
                                                <motion.div className={`text-sm mt-2 p-3 rounded-lg ${promptSaved.type === "success" ? "bg-green-900 text-green-400 border border-green-800" : "bg-red-900 text-red-400 border border-red-800"}`} role="status" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                                                    {promptSaved.text}
                                                </motion.div>
                                            )}
                                        </AnimatePresence>

                                        {promptSaved?.type === "success" && (
                                            <motion.div className="mt-4 border border-gray-700 rounded-lg p-4 bg-gray-800 text-sm" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} transition={{ duration: 0.3 }}>
                                                <strong className="block mb-2 text-gray-300">Prompt Preview</strong>
                                                <div className="whitespace-pre-wrap text-gray-300 bg-gray-700 p-3 rounded border border-gray-600">{prompt}</div>
                                            </motion.div>
                                        )}
                                    </form>
                                </motion.section>

                                {/* Schedule Meeting (minimal - Start button only) */}
                                <motion.section className="bg-gray-800 rounded-xl p-6 border border-gray-700" initial="hidden" animate="visible" variants={cardVariants} transition={{ duration: 0.3, delay: 0.3 }}>
                                    <div className="flex items-center justify-between mb-6">
                                        <div>
                                            <h2 className="text-xl font-bold text-gray-200 flex items-center gap-2">
                                                <span className="p-2 bg-purple-900 rounded-lg text-purple-400"><FaClock /></span>
                                                Schedule Meeting
                                            </h2>
                                            <p className="text-sm text-gray-500 mt-1">Click Start to generate a meeting ID</p>
                                        </div>
                                        <motion.div whileHover={{ rotate: 90 }} className="text-gray-500 hover:text-gray-300 cursor-pointer" onClick={() => { setMeetingId(null); setSchedulingError(null); }}>
                                            <FaTimes />
                                        </motion.div>
                                    </div>

                                    <div className="flex items-center gap-3 pt-2">
                                        <motion.button onClick={onStartScheduleClick} className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-purple-500 text-white rounded-lg text-sm font-medium hover:from-purple-700 hover:to-purple-600 shadow-md" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
                                            <FaPlay className="text-xs" /> {isScheduling ? "Starting..." : "Start"}
                                        </motion.button>

                                        <button type="button" onClick={() => { setMeetingId(null); setSchedulingError(null); }} className="px-4 py-2.5 border border-gray-600 rounded-lg text-sm font-medium text-gray-300 hover:bg-gray-700 transition-colors">Clear</button>
                                    </div>

                                    <AnimatePresence>
                                        {schedulingError && (
                                            <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-3 text-sm text-red-400 bg-red-900/40 p-3 rounded border border-red-800">
                                                {schedulingError}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    {meetingId && (
                                        <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="mt-4 p-3 bg-green-900/20 border border-green-800 rounded">
                                            <div className="text-sm text-gray-300">Meeting ID</div>
                                            <div className="mt-1 font-medium text-gray-200">{meetingId}</div>
                                            <div className="mt-2 flex gap-2">
                                                <button onClick={() => navigator.clipboard?.writeText(meetingId)} className="px-3 py-1.5 bg-gray-700 rounded text-sm text-gray-200 hover:bg-gray-600">Copy ID</button>
                                                <button onClick={() => navigate(`/room/${encodeURIComponent(meetingId)}?userId=${encodeURIComponent(user?.email || "")}&role=interviewer`)} className="px-3 py-1.5 bg-purple-600 rounded text-sm text-white hover:bg-purple-700">Open Room</button>
                                            </div>
                                        </motion.div>
                                    )}
                                </motion.section>
                            </div>
                        </div>
                    ) : (
                        <CodePlayback />
                    )}
                </main>
            </div>
        </div>
    );
};

export default Dashboard;
