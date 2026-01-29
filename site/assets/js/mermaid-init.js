document.addEventListener("DOMContentLoaded", function() {
  if (typeof mermaid !== "undefined") {
    mermaid.initialize({
      startOnLoad: false,
      theme: "dark",
      flowchart: {
        useMaxWidth: true,
        htmlLabels: true
      }
    });
    mermaid.init(undefined, document.querySelectorAll(".mermaid"));
  }
});
