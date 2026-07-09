import { AppFrame } from "@/components/pillcheck/AppFrame";
import { CameraCapture } from "@/components/pillcheck/CameraCapture";

export default function ScanPage() {
  return (
    <AppFrame>
      <CameraCapture />
    </AppFrame>
  );
}
