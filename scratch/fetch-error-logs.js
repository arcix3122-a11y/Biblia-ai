const url = "https://txwksirnvzoifcdpniby.supabase.co/rest/v1/error_logs?select=*&order=created_at.desc&limit=5";
const anonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR4d2tzaXJudnpvaWZjZHBuaWJ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzNDY4NjEsImV4cCI6MjA5MTkyMjg2MX0.S2-kLuCQvp4fdzKXMzUHyDsLrfnyvvyTQTRmKLWCg8g";

async function run() {
  console.log("Fetching recent error logs...");
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "apikey": anonKey,
        "Authorization": `Bearer ${anonKey}`,
        "Content-Type": "application/json"
      }
    });
    
    if (!response.ok) {
      console.error(`HTTP error! Status: ${response.status}`);
      const text = await response.text();
      console.error(text);
      return;
    }
    
    const logs = await response.json();
    console.log(`Successfully fetched ${logs.length} logs:`);
    console.log(JSON.stringify(logs, null, 2));
  } catch (error) {
    console.error("Failed to fetch logs:", error);
  }
}

run();
