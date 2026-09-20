(() => {
  const form = document.getElementById("signup-form");
  const email = document.getElementById("email");
  const fields = document.getElementById("signup-fields");
  const error = document.getElementById("signup-error");
  const success = document.getElementById("signup-success");
  const signupLink = document.getElementById("signup-link");
  const storageKey = "gooddaynight.signupEmail";

  if (!form || !email || !fields || !error || !success || !signupLink) return;

  const revealFields = () => {
    fields.hidden = false;
    email.focus();
  };

  const showSuccess = () => {
    form.classList.add("is-success");
    fields.hidden = true;
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

  signupLink.addEventListener("click", (event) => {
    event.preventDefault();
    if (form.classList.contains("is-success")) return;
    revealFields();
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    if (fields.hidden) {
      revealFields();
      return;
    }

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
