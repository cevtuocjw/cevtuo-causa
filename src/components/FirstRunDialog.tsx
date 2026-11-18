import { AnimatePresence, motion } from "motion/react";
import { BookOpen, PenLine } from "lucide-react";

export function FirstRunDialog({
  open,
  onEmpty,
  onDemo,
}: {
  open: boolean;
  onEmpty: () => void;
  onDemo: () => void;
}) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="overlay"
          role="presentation"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="dialog glass"
            role="dialog"
            aria-modal="true"
            aria-label="开始使用"
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
          >
            <div className="dialog-head">
              <h2>先写下第一条判断</h2>
              <span className="pill">本机</span>
            </div>
            <p className="dialog-lead">
              这本账只做三件事：记录你的推断、到期结算、按你实际说过的置信度校准。
              没有账号，也不上传数据。
            </p>
            <div className="dialog-rows">
              <div>
                <span>建议</span>
                <b>一条 30–90 天内能验证的判断</b>
              </div>
              <div>
                <span>必填</span>
                <b>反事实与到期日</b>
              </div>
              <div>
                <span>演示</span>
                <b>演示记录默认不计入你的校准</b>
              </div>
            </div>
            <div className="dialog-actions">
              <button type="button" className="btn" onClick={onEmpty}>
                <PenLine size={14} /> 从空白开始
              </button>
              <button type="button" className="btn btn-primary" onClick={onDemo}>
                <BookOpen size={14} /> 载入演示账本
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
