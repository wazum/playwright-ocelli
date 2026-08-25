import { expect, test } from '@playwright/test'

const baseline = Boolean(process.env.BASELINE)

const card = ({ price, background }: { price: string; background: string }) => `
  <body style="margin:0;font:16px/1.4 -apple-system,sans-serif;background:${background}">
    <div style="padding:40px;color:#111">
      <div style="font-size:13px;letter-spacing:.08em;text-transform:uppercase;opacity:.55">Checkout</div>
      <div style="font-size:44px;font-weight:600;margin:8px 0 24px">${price}</div>
      <div style="background:#111;color:#fff;padding:12px 20px;border-radius:8px;display:inline-block">Pay now</div>
    </div>
  </body>`

test('price renders', async ({ page }) => {
  await page.setContent(card({ price: '&euro;49.00', background: '#f6f6f6' }))
  await expect(page).toHaveScreenshot('price.png')
})

test('discounted price renders', async ({ page }) => {
  await page.setContent(
    card({
      price: baseline ? '&euro;49.00' : '&euro;49.90',
      background: '#f6f6f6',
    }),
  )
  await expect(page).toHaveScreenshot('discount.png')
})

test('checkout theme renders', async ({ page }) => {
  await page.setContent(
    card({
      price: '&euro;49.00',
      background: baseline ? '#f6f6f6' : '#1d4ed8',
    }),
  )
  await expect(page).toHaveScreenshot('theme.png')
})
