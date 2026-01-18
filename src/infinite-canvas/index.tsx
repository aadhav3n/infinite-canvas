import * as React from "react";

const LazyInfiniteCanvasScene = React.lazy(() => 
  import("./scene").then((mod) => ({ default: mod.InfiniteCanvasScene }))
    .catch((err) => {
      console.error("Failed to load InfiniteCanvasScene:", err);
      throw err;
    })
);

export function InfiniteCanvas(props: React.ComponentProps<typeof LazyInfiniteCanvasScene>) {
  const [error, setError] = React.useState<Error | null>(null);

  // Check WebGL support before rendering
  React.useEffect(() => {
    try {
      const canvas = document.createElement("canvas");
      const gl = canvas.getContext("webgl") || canvas.getContext("webgl2") || canvas.getContext("experimental-webgl");
      if (!gl) {
        setError(new Error("WebGL is not supported on this device"));
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to check WebGL support"));
    }
  }, []);

  if (error) {
    return (
      <div style={{ 
        display: "flex", 
        justifyContent: "center", 
        alignItems: "center", 
        height: "100vh", 
        color: "red",
        padding: "2rem",
        textAlign: "center"
      }}>
        <div>
          <h2>WebGL Not Supported</h2>
          <p>{error.message}</p>
          <p style={{ fontSize: "0.9rem", marginTop: "1rem", color: "#999" }}>
            This site requires WebGL support. Please try using a different browser or device.
          </p>
        </div>
      </div>
    );
  }

  return (
    <React.Suspense 
      fallback={null}
    >
      <ErrorBoundary>
        <LazyInfiniteCanvasScene {...props} />
      </ErrorBoundary>
    </React.Suspense>
  );
}

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("InfiniteCanvas error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ 
          display: "flex", 
          justifyContent: "center", 
          alignItems: "center", 
          height: "100vh", 
          color: "red",
          padding: "2rem",
          textAlign: "center"
        }}>
          <div>
            <h2>Failed to Load Canvas</h2>
            <p>{this.state.error?.message || "An unknown error occurred"}</p>
            <p style={{ fontSize: "0.9rem", marginTop: "1rem", color: "#999" }}>
              Please refresh the page or try again later.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
