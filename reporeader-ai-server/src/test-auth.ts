const BASE_URL = "http://localhost:3000";

// 1. Define the "Shape" of our API responses
interface AuthResponse {
    token: string;
    user: {
        id: string;
        email: string;
        name: string | null;
    };
}

interface ErrorResponse {
    error: string;
}

async function testAuth() {
    console.log("🚀 Starting Auth Test...\n");

    // --- HEALTH CHECK ---
    try {
        const health = await fetch(`${BASE_URL}/`);
        console.log("✅ Health Check:", await health.text());
    } catch (error) {
        console.error("❌ Server is not running! Make sure 'npm run dev' is active.");
        return;
    }

    const randomEmail = `test-${Math.floor(Math.random() * 1000)}@example.com`;
    const password = "password123";

    // --- REGISTER ---
    console.log(`\n--- 1. Registering User (${randomEmail}) ---`);

    const registerRes = await fetch(`${BASE_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            email: randomEmail,
            password: password,
            name: "Test User",
        }),
    });

    // Type assertion: We tell TS "Trust me, this is either AuthResponse or ErrorResponse"
    const registerData = (await registerRes.json()) as AuthResponse | ErrorResponse;

    if (registerRes.ok) {
        console.log("✅ Registration Successful:", registerData);
    } else {
        console.error("❌ Registration Failed:", registerData);
        return;
    }

    // --- LOGIN ---
    console.log(`\n--- 2. Logging In ---`);

    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            email: randomEmail,
            password: password,
        }),
    });

    // Explicitly cast the response
    const loginData = (await loginRes.json()) as AuthResponse;

    if (loginRes.ok) {
        console.log("✅ Login Successful!");
        // Now TypeScript knows that 'loginData' has a 'token' property
        console.log("🔑 JWT Token received:", loginData.token.substring(0, 20) + "...");
        console.log("👤 User Info:", loginData.user);
    } else {
        console.error("❌ Login Failed:", loginData);
    }
}

testAuth();