# Code Audit Report for fig.js

## Critical Bugs

### 1. **Infinite Recursion in FigButton.type getter (Line 58-59)**
**Location:** `FigButton` class, lines 58-59
**Issue:** The getter returns `this.type`, which calls itself infinitely
```javascript
get type() {
  return this.type;  // ❌ Infinite recursion!
}
```
**Fix:** Should return `this.getAttribute("type")` or use a private field
```javascript
get type() {
  return this.getAttribute("type") || "button";
}
```

### 2. **Impossible Logic Condition (Multiple locations)**
**Locations:** 
- Line 103 (FigButton)
- Line 1043 (FigSlider)
- Line 1304 (FigInputText)

**Issue:** The condition `newValue === undefined && newValue !== null` is logically impossible. A value cannot be both `undefined` and not `null` simultaneously.

**Current code:**
```javascript
this.disabled = this.input.disabled =
  newValue === "true" ||
  (newValue === undefined && newValue !== null);
```

**Fix:** Should be:
```javascript
this.disabled = this.input.disabled =
  newValue !== null && newValue !== "false";
```

## Documentation Issues

### 3. **Missing Documentation for Utility Functions**
**Location:** Lines 1-6
**Issue:** `figUniqueId()` and `figSupportsPopover()` lack JSDoc comments

**Fix:** Add documentation:
```javascript
/**
 * Generates a unique ID string using timestamp and random values
 * @returns {string} A unique identifier
 */
function figUniqueId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

/**
 * Checks if the browser supports the native popover API
 * @returns {boolean} True if popover is supported
 */
function figSupportsPopover() {
  return HTMLElement.prototype.hasOwnProperty("popover");
}
```

### 4. **Incomplete Documentation for FigButton**
**Location:** Line 10
**Issue:** Documentation mentions "button", "toggle", "submit" but code also supports "link" type (line 81)

**Fix:** Update documentation:
```javascript
 * @attr {string} type - The button type: "button" (default), "toggle", "submit", or "link"
```

### 5. **Missing Documentation for FigButton Attributes**
**Location:** FigButton class
**Issue:** Missing documentation for `href` and `target` attributes used in link type

**Fix:** Add to JSDoc:
```javascript
 * @attr {string} href - URL for link type buttons
 * @attr {string} target - Target window for link type buttons
```

### 6. **Missing Documentation for FigInputNumber**
**Location:** Line 1358
**Issue:** Missing `composed` property in CustomEvent documentation (though it's used in code)

## Potential Issues

### 7. **Unused Function**
**Location:** Line 4-6
**Issue:** `figSupportsPopover()` is defined but never used in the codebase

**Recommendation:** Either use it or remove it

### 8. **Inconsistent Disabled Attribute Handling**
**Location:** Multiple components
**Issue:** Different components handle disabled attributes slightly differently:
- Some check `newValue === "true" || (newValue === undefined && newValue !== null)`
- Others check `newValue !== null && newValue !== "false"`

**Recommendation:** Standardize on one approach (preferably the second, which is correct)

### 9. **Missing Error Handling**
**Location:** Multiple locations
**Issue:** No error handling for:
- `querySelector` calls that might return null
- `getAttribute` calls that might return unexpected values
- Event listener setup failures

**Example:** Line 54 - `this.button` might be null if querySelector fails

### 10. **Potential Memory Leak**
**Location:** FigTooltip, line 310
**Issue:** Event listener added in `destroy()` method:
```javascript
destroy() {
  if (this.popup) {
    this.popup.remove();
  }
  document.body.addEventListener("click", this.hidePopupOutsideClick); // ❌ Added but never removed
}
```

### 11. **Inconsistent Value Type Handling**
**Location:** FigInputNumber, line 1393-1394
**Issue:** Value is converted to Number but can be empty string:
```javascript
this.value = valueAttr !== null && valueAttr !== "" ? Number(valueAttr) : "";
```
This creates inconsistent types (Number vs String)

### 12. **Missing Input Validation**
**Location:** FigInputNumber, line 1551
**Issue:** No validation that `numericValue` is a valid number before division:
```javascript
this.value = Number(numericValue) / (this.transform || 1);
```
If `numericValue` is empty or invalid, this could result in NaN

## Code Quality Issues

### 13. **Magic Numbers**
**Location:** Multiple locations
**Issue:** Hard-coded values without explanation:
- Line 246: `delay = 500` (default delay)
- Line 1617: `precision = 2` (default precision)
- Line 1635: `Math.round(num * 100) / 100` (rounding logic)

**Recommendation:** Extract to named constants or document them

### 14. **Inconsistent Naming**
**Location:** FigSlider
**Issue:** Method named `#handleTextInput` but now works with `figInputNumber`

**Recommendation:** Rename to `#handleNumberInput` for clarity

### 15. **Missing Type Checks**
**Location:** Multiple locations
**Issue:** No type validation for attributes that should be numbers:
- `min`, `max`, `step`, `transform` attributes

**Recommendation:** Add validation or use `Number()` with NaN checks

## Summary

**Critical Bugs:** 2
**Documentation Issues:** 4
**Potential Issues:** 6
**Code Quality Issues:** 3

**Total Issues Found:** 15

## Priority Fixes

1. **HIGH:** Fix infinite recursion in FigButton.type getter
2. **HIGH:** Fix impossible logic condition in disabled attribute handling
3. **MEDIUM:** Add missing documentation
4. **MEDIUM:** Fix memory leak in FigTooltip.destroy()
5. **LOW:** Standardize disabled attribute handling
6. **LOW:** Add input validation

