/** @type {import('conventional-changelog-config-spec').Config} */
module.exports = {
  types: [
    { type: "feat", section: "Features" },
    { type: "fix", section: "Bug Fixes" },
    { type: "security", section: "Security" },
    { type: "perf", section: "Performance" },
    { type: "docs", section: "Documentation" },
    { type: "refactor", section: "Refactoring" },
    { type: "test", section: "Tests" },
    { type: "build", section: "Build System", hidden: true },
    { type: "ci", section: "CI/CD", hidden: true },
    { type: "chore", section: "Chores", hidden: true },
    { type: "style", section: "Styles", hidden: true },
    { type: "revert", section: "Reverts" },
  ],
  commitUrlFormat: "https://github.com/jamsmac/VendHub-OS/commit/{{hash}}",
  compareUrlFormat:
    "https://github.com/jamsmac/VendHub-OS/compare/{{previousTag}}...{{currentTag}}",
  issueUrlFormat: "https://github.com/jamsmac/VendHub-OS/issues/{{id}}",
};
