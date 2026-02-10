// Function to get current battery status
export async function getBatteryStatus(): Promise<{ level: number, charging: boolean }> {
  if ('getBattery' in navigator) {
    try {
      // @ts-ignore - Navigator.getBattery is not in standard TS types yet
      const battery = await navigator.getBattery();
      return {
        level: Math.round(battery.level * 100),
        charging: battery.charging
      };
    } catch (e) {
      console.warn("Battery API error", e);
      return { level: 100, charging: true }; // Fallback
    }
  }
  return { level: 100, charging: true }; // Mock fallback for desktop/unsupported
}

// Function to get current geolocation
export function getGeoLocation(): Promise<string> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve("Location Unknown");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        resolve(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
      },
      (error) => {
        console.warn("Geolocation error", error);
        resolve("Location Access Denied");
      },
      { timeout: 5000 }
    );
  });
}
