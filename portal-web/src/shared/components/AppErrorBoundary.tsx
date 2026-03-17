import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = { children: ReactNode };
type State = { hasError: boolean };

export default class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[portal-web][boundary]", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <div>Ocurrio un error inesperado en el portal.</div>;
    }

    return this.props.children;
  }
}
