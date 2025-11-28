import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { sendCapture } from '../api/capture';
import { enqueueCapture } from '../utils/offlineQueue';
import { useVoiceCapture } from '../hooks/useVoiceCapture';
export function CaptureForm({ boards, ownerId, onCaptured }) {
    const [text, setText] = useState('');
    const [boardId, setBoardId] = useState(() => boards[0]?.id ?? '');
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState(null);
    const { listening, start, stop, supported, transcript, reset } = useVoiceCapture();
    useEffect(() => {
        if (!boardId && boards[0]) {
            setBoardId(boards[0].id);
        }
    }, [boardId, boards]);
    const targetBoardId = boardId || boards[0]?.id || '';
    const handleSubmit = async (event) => {
        event.preventDefault();
        if (!ownerId || !targetBoardId || !text.trim()) {
            setMessage('Owner, board, and text are required');
            return;
        }
        setSubmitting(true);
        setMessage(null);
        const payload = {
            ownerId,
            boardId: targetBoardId,
            text: `${text.trim()}${transcript ? ` ${transcript}` : ''}`.trim(),
            source: 'web-quick-add',
        };
        try {
            await sendCapture(payload);
            setMessage('Captured successfully');
            setText('');
            reset();
            onCaptured?.();
        }
        catch (error) {
            enqueueCapture(payload);
            setMessage('Offline? Task queued for sync.');
        }
        finally {
            setSubmitting(false);
        }
    };
    return (_jsxs("section", { className: "capture-card", children: [_jsxs("header", { children: [_jsx("p", { className: "eyebrow", children: "Quick capture" }), _jsx("h2", { children: "Send anything to your Input queue" })] }), _jsxs("form", { onSubmit: handleSubmit, className: "capture-form", children: [_jsxs("label", { children: ["Board", _jsx("select", { value: targetBoardId, onChange: (event) => setBoardId(event.target.value), children: boards.map((board) => (_jsx("option", { value: board.id, children: board.name }, board.id))) })] }), _jsxs("label", { children: ["Text or URL", _jsx("textarea", { value: text, onChange: (event) => setText(event.target.value), placeholder: "Type or paste anything..." })] }), supported && (_jsxs("div", { className: "voice-controls", children: [_jsx("button", { type: "button", onClick: listening ? stop : start, children: listening ? 'Stop dictation' : 'Voice capture' }), transcript && _jsxs("span", { className: "muted", children: ["Voice: ", transcript] })] })), _jsx("button", { type: "submit", disabled: submitting || !ownerId, children: submitting ? 'Capturing...' : 'Capture' })] }), message && _jsx("p", { className: "muted", children: message })] }));
}
//# sourceMappingURL=CaptureForm.js.map