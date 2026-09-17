document.querySelectorAll(".unit-list li").forEach((item) => {
  const label = document.createElement("span");
  label.className = "computed";
  label.textContent = " computed " + window.getComputedStyle(item).fontSize;
  item.appendChild(label);
});
