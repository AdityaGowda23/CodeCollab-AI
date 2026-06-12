import React, { useState } from "react";
import Navbar from "./Navbar";
import { executeCode } from "../services/codeExecution";

const Code = () => {
  const [language, setLanguage] = useState("python");
  const [code, setCode] = useState("print(input())");
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRun = async () => {
    setLoading(true);
    setOutput("");

    try {
      const result = await executeCode({ language, code, stdin: input });
      setOutput(result.output || "No output");
    } catch (error) {
      setOutput("Error: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />
      <div
        style={{
          fontFamily: "sans-serif",
          padding: "1rem",
          maxWidth: "700px",
          margin: "auto",
        }}
      >
        <h2>🚀 Code Runner (Piston API)</h2>

        <label>
          Language:
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            style={{ marginLeft: "10px" }}
          >
            <option value="python">Python</option>
            <option value="javascript">JavaScript</option>
            <option value="cpp">C++</option>
            <option value="java">Java</option>
          </select>
        </label>

        <br />
        <br />

        <label>Code:</label>
        <br />
        <textarea
          rows="10"
          cols="70"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Write your code here"
          style={{ fontFamily: "monospace", width: "100%" }}
        ></textarea>

        <br />
        <br />

        <label>Input:</label>
        <br />
        <textarea
          rows="3"
          cols="70"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Input to the program"
          style={{ width: "100%" }}
        ></textarea>

        <br />
        <br />

        <button onClick={handleRun} disabled={loading}>
          {loading ? "Running..." : "Run Code"}
        </button>

        <br />
        <br />

        <label>Output:</label>
        <pre
          style={{
            backgroundColor: "#f4f4f4",
            padding: "1rem",
            minHeight: "60px",
          }}
        >
          {output}
        </pre>
      </div>
    </>
  );
};

export default Code;
