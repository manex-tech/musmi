// Add the public Tally form URL here after creating the waitlist form.
const TALLY_FORM_URL = "";
const form = document.getElementById("waitlist-form");
const note = document.getElementById("form-note");
form?.addEventListener("submit", (event) => {
 event.preventDefault();
 const email = document.getElementById("email").value.trim();
 if (!email) return;
 if (!TALLY_FORM_URL) { note.textContent = "The waitlist signup is being connected. Please check back shortly."; return; }
 const url = new URL(TALLY_FORM_URL); url.searchParams.set("email", email);
 window.open(url.toString(), "_blank", "noopener,noreferrer");
 note.textContent = "Complete the form in the new tab to join the waitlist.";
});