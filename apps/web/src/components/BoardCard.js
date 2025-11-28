import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export function BoardCard({ board }) {
    return (_jsxs("section", { className: "board-card", children: [_jsxs("header", { children: [_jsx("h2", { children: board.name }), board.description && _jsx("p", { className: "muted", children: board.description })] }), _jsx("div", { className: "columns", children: board.columns?.length ? (board.columns.map((column) => (_jsxs("article", { className: "column", children: [_jsx("h3", { children: column.name }), _jsxs("p", { className: "muted", children: ["Type: ", column.type.toLowerCase(), " \u00B7 WIP ", column.wipLimit ?? '∞'] })] }, column.id)))) : (_jsx("p", { className: "muted", children: "No columns configured yet." })) })] }));
}
//# sourceMappingURL=BoardCard.js.map