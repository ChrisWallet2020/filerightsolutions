/**
 * POST a classic HTML form via fetch, then navigate to the final URL.
 * Uses `redirect: "follow"` so the browser applies Set-Cookie across the redirect chain.
 *
 * Auth routes must answer POST with **303 See Other** (not 307) so the follow-up request is GET;
 * otherwise fetch would re-POST to the destination and can break navigation.
 */
export async function submitHtmlFormRedirect(form: HTMLFormElement): Promise<void> {
  const action = form.getAttribute("action");
  if (!action) throw new Error("Form missing action");

  const res = await fetch(action, {
    method: "POST",
    body: new FormData(form),
    redirect: "follow",
    credentials: "same-origin",
  });

  if (!res.ok) {
    throw new Error(`Unexpected response (${res.status})`);
  }

  window.location.assign(res.url);
}
