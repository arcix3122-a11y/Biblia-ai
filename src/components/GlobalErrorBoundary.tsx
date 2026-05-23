import React, { Component, type ErrorInfo, type ReactNode } from "react";
import { logError } from "@/services/errors/errorLogger";
import { ErrorFallback } from "./ErrorFallback";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

export class GlobalErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: "" };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    logError(error, "GlobalErrorBoundary", { componentStack: info.componentStack });
  }

  private handleReset = (): void => {
    this.setState({ hasError: false, message: "" });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <ErrorFallback
          message={this.state.message}
          onRetry={this.handleReset}
        />
      );
    }
    return this.props.children;
  }
}
