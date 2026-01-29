// Mermaid v11 with 3D handDrawn style!
document.addEventListener("DOMContentLoaded", function() {
  if (typeof mermaid !== "undefined") {
    mermaid.initialize({
      startOnLoad: true,
      theme: "dark",
      look: "handDrawn",  // NEW v11 - 3D sketchy style!
      layout: "elk",       // NEW v11 - better auto-layout
      flowchart: {
        useMaxWidth: true,
        htmlLabels: true,
        curve: "basis",
        padding: 20
      },
      sequence: {
        useMaxWidth: true,
        wrap: true
      },
      gantt: {
        useMaxWidth: true
      }
    });
  }
});
