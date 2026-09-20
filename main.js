(() => {
  const form = document.getElementById("signup-form");
  const email = document.getElementById("email");
  const live = document.getElementById("signup-live");
  const error = document.getElementById("signup-error");
  const success = document.getElementById("signup-success");
  const storageKey = "gooddaynight.signupEmail";

  if (!form || !email || !live || !error || !success) return;

  const showSuccess = () => {
    form.classList.add("is-success");
    live.hidden = true;
    error.hidden = true;
    success.hidden = false;
    success.focus();
  };

  try {
    if (window.localStorage.getItem(storageKey)) {
      showSuccess();
    }
  } catch {
    // Private mode or blocked storage should not break the form.
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const value = email.value.trim();
    const valid = value.length > 0 && email.checkValidity();

    if (!valid) {
      error.hidden = false;
      email.setAttribute("aria-invalid", "true");
      email.focus();
      return;
    }

    try {
      window.localStorage.setItem(storageKey, value);
    } catch {
      // Keep the success state even if we cannot persist it.
    }

    email.removeAttribute("aria-invalid");
    showSuccess();
  });
})();
