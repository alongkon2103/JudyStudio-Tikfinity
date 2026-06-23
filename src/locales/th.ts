/**
 * Thai dictionary. Keep entries flat-ish so the keys read like a
 * sentence path — easy to grep, easy for new contributors to find
 * the right copy without spelunking through nested objects.
 */
export const th = {
  brand: {
    studio:  "Judy Studio",
    product: "Tikfinity",
    name:    "Judy Studio | Tikfinity",
    tagline: "ต่ออายุ Tikfinity Pro ราคาดี รับสิทธิ์ทันที",
  },
  nav: {
    home:    "หน้าหลัก",
    admin:   "Admin",
    theme:   { dark: "โหมดมืด", light: "โหมดสว่าง" },
    locale:  { th: "ไทย", en: "EN" },
  },
  home: {
    title:       "ต่ออายุ Tikfinity Pro",
    subtitle:    "กรอกอีเมล Tikfinity เลือกระยะเวลา ชำระเงิน ระบบต่ออายุให้อัตโนมัติทันที",
    perk: {
      instant:  { title: "รับสิทธิ์ทันที",   body: "เปิดใช้งานอัตโนมัติหลังชำระเงินสำเร็จ" },
      safe:     { title: "ปลอดภัย ผ่าน Stripe", body: "รองรับบัตร + PromptPay ผ่าน Stripe Checkout" },
      reseller: { title: "ตัวแทนอย่างเป็นทางการ", body: "เชื่อมตรงกับ Tikfinity Reseller API" },
    },
  },
  step: {
    email:    "กรอกอีเมล",
    duration: "เลือกระยะเวลา",
    method:   "ช่องทางชำระเงิน",
    pay:      "ชำระเงิน",
  },
  confirm: {
    title:      "ยืนยันการสั่งซื้อ",
    body:       "ตรวจสอบรายละเอียดให้แน่ใจก่อนชำระเงิน",
    durationLabel: "แพ็กเกจ",
    accountLabel:  "บัญชี",
    methodLabel:   "ช่องทางชำระเงิน",
    baseLabel:     "ราคา",
    feeLabel:      "ค่าธรรมเนียม",
    periodLabel:   "ช่วงเวลา Pro ใหม่",
    startsLabel:   "เริ่ม",
    endsLabel:     "หมดอายุ",
    daysSuffix:    "วัน",
    startsToday:   "วันนี้ทันที",
    stackedNote:   "ต่อจากที่เหลืออยู่",
    totalLabel:    "ยอดชำระ",
    confirmBtn: "ยืนยัน · ไปจ่ายเงิน",
    cancelBtn:  "ยกเลิก",
  },
  form: {
    emailLabel:       "Email ที่ใช้กับ Tikfinity",
    emailPlaceholder: "you@example.com",
    checkEmail:       "ตรวจสอบอีเมล",
    checking:         "กำลังตรวจสอบ…",
    change:           "เปลี่ยน",
    redirecting:      "กำลังพาไปหน้าชำระเงิน…",
    chooseDuration:   "เลือกระยะเวลา",
    choosePayment:    "เลือกช่องทางชำระเงิน",
    paymentHint:      "ค่าธรรมเนียมขึ้นกับช่องทางที่เลือก — PromptPay ฟรี, บัตรเครดิตคิด 6% ตามอัตราของธนาคาร",
    continueBtn:      "ดำเนินการต่อ",
    backBtn:          "ย้อนกลับ",
    perOrder:         "ชำระครั้งเดียว",
    recommended:      "แนะนำ",
    days:             "วัน",
    extendDays:       "ต่ออายุ {days} วัน",
    noFee:            "ไม่มีค่าธรรมเนียม",
    feePercent:       "+{percent}% ค่าธรรมเนียม",
    totalLabel:       "รวม",
    methodUnavailable: "ไม่มีช่องทางชำระเงินที่เปิดอยู่ในขณะนี้",
  },
  user: {
    accountLabel: "บัญชี Tikfinity",
    expiresLabel: "Pro หมดอายุ",
    statusLabel:  "สถานะ",
    active:       "Active",
    inactive:     "Inactive",
    neverPro:     "ยังไม่เคยเป็น Pro",
  },
  errors: {
    invalidEmail:   "กรุณาใส่ email ให้ถูกต้อง",
    emailNotFound:  "ไม่พบ email นี้ใน Tikfinity — กรุณาสมัครและล็อกอินใน Tikfinity ก่อนอย่างน้อย 1 ครั้ง",
    network:        "เชื่อมต่อไม่สำเร็จ กรุณาลองใหม่",
    upstream:       "เชื่อมต่อ Tikfinity ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง",
    rateLimited:    "ตรวจสอบบ่อยเกินไป กรุณารอสักครู่",
    generic:        "เกิดข้อผิดพลาด",
  },
  success: {
    title:      "ต่ออายุสำเร็จ",
    package:    "แพ็กเกจ",
    total:      "ยอดชำระ",
    newExpire:  "หมดอายุใหม่",
    refresh:    "สิทธิ์ Pro ใช้ได้ทันทีบน Tikfinity — หากยังไม่อัปเดต ให้ refresh แอป Tikfinity",
    buyMore:    "ซื้อเพิ่มอีก",
    processing: "กำลังต่ออายุให้คุณ…",
    paid:       "รับชำระเงินแล้ว · กำลังเรียกระบบ Tikfinity",
    longer:     "ใช้เวลานานกว่าปกติ ระบบยังคงดำเนินการอยู่ คุณสามารถปิดหน้านี้ได้ ระบบจะต่ออายุให้เมื่อเสร็จ",
    failedHead: "ชำระเงินสำเร็จ แต่ต่ออายุยังไม่สำเร็จ",
    failedBody: "ระบบจะให้แอดมินดูแลให้ภายในไม่นาน ติดต่อแอดมินพร้อมเลข session ได้เลย",
    session:    "session",
    noOrder:    "ไม่พบรายการสั่งซื้อ",
    waitNote:   "หากเพิ่งชำระเงิน กรุณารอสักครู่แล้วลองใหม่",
    backHome:   "กลับหน้าหลัก",
  },
  cancel: {
    title:    "ยกเลิกการชำระเงิน",
    body:     "ไม่มีการเรียกเก็บเงิน — สามารถกลับไปสั่งซื้อใหม่ได้ทุกเมื่อ",
    backHome: "กลับหน้าหลัก",
  },
  footer: {
    tagline: "JudyShop Tikfinity · ตัวแทนจำหน่ายอย่างเป็นทางการ",
  },
};

/**
 * Deep-widen string literals so the `en` dictionary can hold any
 * string for each key without TS demanding the exact same Thai
 * literal that `th` happens to use.
 */
type Widen<T> = T extends string
  ? string
  : T extends readonly (infer U)[]
    ? Widen<U>[]
    : { [K in keyof T]: Widen<T[K]> };

export type Dict = Widen<typeof th>;
