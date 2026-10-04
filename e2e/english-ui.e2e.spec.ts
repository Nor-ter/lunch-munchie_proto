import { expect, test } from "playwright/test";

for (const width of [390, 1280]) {
  test(`English navigation and copy at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 844 });
    await page.route("**/api/**", (route) => {
      const pathname = new URL(route.request().url()).pathname;
      return route.fulfill({
        contentType: "application/json",
        body: pathname === "/api/auth/session" ? '{"user":null}' : "[]",
      });
    });
    for (const path of [
      "/lunchie/settings",
      "/saved",
      "/profile",
      "/templates",
    ]) {
      await page.goto(path);
      await expect(page.locator("html")).toHaveAttribute("lang", "en");
      await expect(page.locator("body")).not.toHaveText(/[가-힣]/);
      await expect
        .poll(() =>
          page.evaluate(
            () => document.documentElement.scrollWidth <= window.innerWidth,
          ),
        )
        .toBe(true);
      const labels = await page
        .locator("[aria-label], [placeholder]")
        .evaluateAll((elements) =>
          elements
            .map(
              (element) =>
                `${element.getAttribute("aria-label") ?? ""} ${element.getAttribute("placeholder") ?? ""}`,
            )
            .join(" "),
        );
      expect(labels).not.toMatch(/[가-힣]/);
      await page.screenshot({
        path: testInfo.outputPath(`${path.replaceAll("/", "-")}-${width}.png`),
        fullPage: true,
      });
    }
    await page.goto("/lunchie/settings");
    await expect(
      page.getByRole("button", { name: "Create Lobby & Invite" }),
    ).toBeVisible();
    await page.getByText("What's the occasion?").click();
    await expect(page.getByText("Solo Dining", { exact: true })).toBeVisible();
    await page.getByText("Solo Dining", { exact: true }).click();
    await expect(page.locator("body")).not.toHaveText(/[가-힣]/);
  });
}

test("English invite profile keeps dietary identifiers intact", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route("**/api/**", route => {
    const pathname = new URL(route.request().url()).pathname;
    const body = pathname === "/api/auth/session" ? { user: null }
      : pathname === "/api/sessions/ABC123" ? {
        session: {
          id: "english-session", status: "waiting", group_size: 4,
          host_user_id: "host", filter_dietary: [], filter_vibe: [],
          filter_distance: 1000, distance_enabled: 0, deck_ids: [],
        },
        members: [{ user_id: "host", user_name: "Alex", emoji: "🍚", is_ready: true }],
      } : [];
    return route.fulfill({ contentType: "application/json", body: JSON.stringify(body) });
  });
  await page.goto("/join/ABC123");
  await expect(page.getByText("You're invited!", { exact: true })).toBeVisible();
  await page.getByPlaceholder("e.g. Foodie Alex").fill("Taylor");
  await page.getByRole("button", { name: /Dietary Restrictions/ }).click();
  await page.getByRole("button", { name: "Vegetarian", exact: true }).click();
  await page.getByRole("button", { name: "Pork", exact: true }).click();
  await expect(page.getByText(/2 selected.*Vegetarian, Pork/)).toBeVisible();
  await expect(page.locator("body")).not.toHaveText(/[가-힣]/);
  await page.screenshot({ path: testInfo.outputPath("english-invite-mobile.png"), fullPage: true });
});
