import { Component } from "react";
import type { ReactNode } from "react";

/**
 * 渲染崩溃时不要把用户丢在白屏。
 * 数据库写入是防抖后的独立路径；这里只负责让错误可见、可重试。
 */
export class ErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="fatal-overlay" role="alertdialog" aria-label="界面异常">
          <div className="dialog glass">
            <div className="dialog-head">
              <h2>界面出错了</h2>
              <span className="pill stale">未自动重置</span>
            </div>
            <p className="dialog-lead">
              本地数据没有被清空。可以先重试；如果持续出现，请先备份数据库并保留下面的错误信息。
            </p>
            <pre className="fatal-error">{String(this.state.error)}</pre>
            <div className="dialog-actions">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => window.location.reload()}
              >
                重试
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
