import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { BoardCard } from './components/BoardCard';
import { CaptureForm } from './components/CaptureForm';
import { OwnerSelector } from './components/OwnerSelector';
import { useBoards } from './hooks/useBoards';
import { useUsers } from './hooks/useUsers';
import { useBoardRealtime } from './hooks/useBoardRealtime';
import './app.css';
export function App() {
    const { users, ownerId, setOwnerId, loading: usersLoading, error: usersError, createUser, } = useUsers();
    const { boards, loading: boardsLoading, error: boardsError, refresh, } = useBoards(ownerId);
    useBoardRealtime(boards.map((board) => board.id), refresh);
    const loading = usersLoading || boardsLoading;
    const error = usersError || boardsError;
    return (_jsxs("main", { className: "page", children: [_jsxs("header", { className: "hero", children: [_jsxs("div", { children: [_jsx("p", { className: "eyebrow", children: "Workspace preview" }), _jsx("h1", { children: "Personal Kanban" }), _jsx("p", { className: "muted", children: "Connect to your self-hosted API, then explore boards, columns, and contexts in real time." })] }), _jsxs("div", { className: "controls", children: [_jsx(OwnerSelector, { users: users, ownerId: ownerId, setOwnerId: setOwnerId, onRegister: async (payload) => {
                                    await createUser(payload);
                                    refresh();
                                }, loading: usersLoading }), _jsx("button", { type: "button", onClick: refresh, disabled: !ownerId || loading, children: "Refresh boards" })] })] }), error && _jsxs("div", { className: "banner error", children: ["Error: ", error] }), loading && _jsx("div", { className: "banner", children: "Loading boards\u2026" }), _jsx(CaptureForm, { boards: boards, ownerId: ownerId, onCaptured: refresh }), _jsxs("div", { className: "boards-grid", children: [boards.map((board) => (_jsx(BoardCard, { board: board }, board.id))), !loading && !boards.length && ownerId && (_jsx("div", { className: "empty-state", children: _jsx("p", { children: "No boards found for this owner." }) }))] })] }));
}
//# sourceMappingURL=App.js.map