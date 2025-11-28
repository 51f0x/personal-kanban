import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
export function OwnerSelector({ users, ownerId, setOwnerId, onRegister, loading }) {
    const [showForm, setShowForm] = useState(false);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [timezone, setTimezone] = useState('');
    const [error, setError] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const handleSubmit = async (event) => {
        event.preventDefault();
        setSubmitting(true);
        setError(null);
        try {
            await onRegister({ name, email, timezone: timezone || undefined });
            setName('');
            setEmail('');
            setTimezone('');
            setShowForm(false);
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to register user');
        }
        finally {
            setSubmitting(false);
        }
    };
    return (_jsxs("div", { className: "owner-panel", children: [_jsxs("label", { children: ["Owner", _jsxs("select", { value: ownerId, onChange: (event) => setOwnerId(event.target.value), disabled: loading, children: [_jsx("option", { value: "", children: "Select existing owner" }), users.map((user) => (_jsxs("option", { value: user.id, children: [user.name, " \u00B7 ", user.email] }, user.id)))] })] }), _jsx("button", { type: "button", onClick: () => setShowForm((prev) => !prev), children: showForm ? 'Hide registration' : 'Register new user' }), showForm && (_jsxs("form", { className: "owner-form", onSubmit: handleSubmit, children: [_jsxs("label", { children: ["Name", _jsx("input", { value: name, onChange: (event) => setName(event.target.value), required: true })] }), _jsxs("label", { children: ["Email", _jsx("input", { type: "email", value: email, onChange: (event) => setEmail(event.target.value), required: true })] }), _jsxs("label", { children: ["Timezone", _jsx("input", { value: timezone, onChange: (event) => setTimezone(event.target.value), placeholder: "UTC" })] }), _jsx("button", { type: "submit", disabled: submitting, children: submitting ? 'Registering...' : 'Register & select' }), error && _jsx("p", { className: "muted", children: error })] }))] }));
}
//# sourceMappingURL=OwnerSelector.js.map