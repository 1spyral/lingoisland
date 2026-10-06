import { grantProduct, revokeProduct, type ProductPlan } from "./product-plans";

describe("product plan changes", () => {
  it.each([
    ["free", "core", "pro"],
    ["free", "hsk", "hsk"],
    ["pro", "hsk", "both"],
    ["hsk", "core", "both"],
    ["both", "core", "both"],
  ] as const)("grants %s + %s as %s", (current, product, expected) => {
    expect(grantProduct(current, product)).toBe(expected);
  });

  it.each([
    ["both", "core", "hsk"],
    ["both", "hsk", "pro"],
    ["pro", "core", "free"],
    ["hsk", "hsk", "free"],
    ["pro", "hsk", "pro"],
  ] as const)("revokes %s - %s as %s", (current, product, expected) => {
    expect(revokeProduct(current, product)).toBe(expected);
  });

  it("restores each original plan after granting and revoking the same product", () => {
    const plans: ProductPlan[] = ["free", "pro", "hsk", "both"];
    for (const plan of plans) {
      for (const product of ["core", "hsk"] as const) {
        if (grantProduct(plan, product) !== plan) {
          expect(revokeProduct(grantProduct(plan, product), product)).toBe(plan);
        }
      }
    }
  });
});
