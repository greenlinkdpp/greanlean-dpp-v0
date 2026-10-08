import assert from "node:assert/strict";
import test from "node:test";
import { canonicalQrRequestTarget } from "../../lib/qrTarget.ts";

test("QR image targets use a stable same-origin path", () => {
  assert.equal(
    canonicalQrRequestTarget("https://www.greanlean.com/p/DPP-LMT-BAT-48V15AH?lang=zh&showcase=1"),
    "/p/DPP-LMT-BAT-48V15AH",
  );
  assert.equal(
    canonicalQrRequestTarget("/p/DPP-LMT-BAT-48V15AH?lang=en#identity"),
    "/p/DPP-LMT-BAT-48V15AH",
  );
});
