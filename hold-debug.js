class AgentxHoldDebug extends HTMLElement {
  connectedCallback() {
    console.log("[WXCC] hold-debug widget connected");

    this.innerHTML = `
      <style>
        .debug-box {
          position: fixed;
          top: 60px;
          right: 20px;
          background: #f7f8fa;
          border: 1px solid #ccc;
          border-radius: 8px;
          padding: 8px 12px;
          font-family: monospace;
          font-size: 13px;
          color: #333;
          z-index: 9999;
          box-shadow: 0 2px 8px rgba(0,0,0,.1);
        }
        .debug-box strong { color: #005a9c; }
        .debug-box .bad { color: #c00; font-weight: bold; }
      </style>
      <div class="debug-box">
        <div><strong>Timer element found:</strong> <span id="found">NO</span></div>
        <div><strong>Hold (from dateTime):</strong> <span id="time">--</span></div>
        <div><strong>Seconds (parsed):</strong> <span id="secs">--</span></div>
      </div>
    `;

    this.$found = this.querySelector("#found");
    this.$time = this.querySelector("#time");
    this.$secs = this.querySelector("#secs");

    this._check();
    setInterval(() => this._check(), 2000);
  }

  _check() {
    const el = document.querySelector('time.agent-current-status-timer');
    if (el) {
      this.$found.textContent = "YES";
      this.$found.classList.remove("bad");
      const dt = el.getAttribute("datetime");
      const visible = el.innerText.trim();
      this.$time.textContent = `${visible} (${dt})`;

      // Try to convert datetime (MM:SS) to seconds
      const parts = dt.split(":").map(Number);
      const seconds = parts[0] * 60 + parts[1];
      this.$secs.textContent = seconds;
    } else {
      this.$found.textContent = "NO";
      this.$found.classList.add("bad");
      this.$time.textContent = "--";
      this.$secs.textContent = "--";
    }
  }
}

customElements.define("agentx-hold-debug", AgentxHoldDebug);
