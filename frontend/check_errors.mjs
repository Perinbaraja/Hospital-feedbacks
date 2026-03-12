import puppeteer from 'puppeteer';

(async () => {
    try {
        const browser = await puppeteer.launch();
        const page = await browser.newPage();

        page.on('console', msg => {
            if (msg.type() === 'error') {
                console.log('PAGE CONSOLE ERROR:', msg.text());
            }
        });

        page.on('pageerror', err => {
            console.log('PAGE EXCEPTION:', err.toString());
        });

        await page.goto('http://localhost:5175/login', { waitUntil: 'networkidle2' });

        await page.type('input[type="email"]', 'admin@hospital.com');
        await page.type('input[type="password"]', 'password123');
        await page.click('button[type="submit"]');

        // Wait 3 seconds to let redirect and render happen
        await new Promise(r => setTimeout(r, 6000));

        console.log('Current URL:', page.url());

        await browser.close();
    } catch (e) {
        console.error("Puppeteer Error:", e);
    }
})();
