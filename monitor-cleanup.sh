#!/bin/bash

# Cleanup Monitoring Script
# Testing Validation Specialist - Automated monitoring during cleanup operations
# Usage: ./monitor-cleanup.sh [quick|full|emergency]

MODE=${1:-quick}
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S UTC')
LOG_FILE="monitoring-results.log"

echo "🔍 CLEANUP MONITORING CHECK - $TIMESTAMP" | tee -a $LOG_FILE
echo "Mode: $MODE" | tee -a $LOG_FILE
echo "===========================================" | tee -a $LOG_FILE

# Function to log results
log_result() {
    echo "$1" | tee -a $LOG_FILE
}

# Function to check build status
check_build() {
    echo "📦 Checking build status..." | tee -a $LOG_FILE
    
    if npm run build > build-temp.log 2>&1; then
        BUILD_TIME=$(grep -o '[0-9]*\.[0-9]*s' build-temp.log | tail -1)
        log_result "✅ Build: SUCCESS ($BUILD_TIME)"
        return 0
    else
        log_result "❌ Build: FAILED"
        log_result "🚨 EMERGENCY: ALL AGENTS MUST STOP IMMEDIATELY"
        cat build-temp.log | tail -20 | tee -a $LOG_FILE
        return 1
    fi
}

# Function to check tests
check_tests() {
    echo "🧪 Checking test suite..." | tee -a $LOG_FILE
    
    if npm run test:unit -- --run --reporter=json > test-temp.json 2>&1; then
        # Parse test results
        if command -v jq > /dev/null; then
            PASSED=$(jq '.testResults | map(.numPassingTests) | add' test-temp.json 2>/dev/null || echo "unknown")
            FAILED=$(jq '.testResults | map(.numFailingTests) | add' test-temp.json 2>/dev/null || echo "unknown")
        else
            PASSED="unknown"
            FAILED="unknown"
        fi
        
        log_result "✅ Tests: $PASSED passed, $FAILED failed"
        
        # Check if passing tests dropped significantly
        if [[ "$PASSED" =~ ^[0-9]+$ ]] && [ "$PASSED" -lt 280 ]; then
            log_result "🚨 EMERGENCY: Test failures detected ($PASSED < 280)"
            log_result "🚨 ALL AGENTS MUST STOP IMMEDIATELY"
            return 1
        fi
        
        return 0
    else
        log_result "❌ Tests: FAILED TO RUN"
        log_result "🚨 EMERGENCY: Test system broken"
        return 1
    fi
}

# Function to check lint status
check_lint() {
    echo "🔧 Checking lint status..." | tee -a $LOG_FILE
    
    LINT_OUTPUT=$(npm run lint 2>&1 | tail -10)
    ERROR_COUNT=$(echo "$LINT_OUTPUT" | grep -o '[0-9]* error' | grep -o '[0-9]*' || echo "0")
    WARNING_COUNT=$(echo "$LINT_OUTPUT" | grep -o '[0-9]* warning' | grep -o '[0-9]*' || echo "0")
    
    log_result "📊 Lint: $WARNING_COUNT warnings, $ERROR_COUNT errors"
    
    # Track if errors increased significantly (beyond baseline 304)
    if [[ "$ERROR_COUNT" =~ ^[0-9]+$ ]] && [ "$ERROR_COUNT" -gt 400 ]; then
        log_result "⚠️  Warning: Lint errors increased significantly"
    fi
}

# Function to check agent coordination
check_coordination() {
    echo "👥 Checking agent coordination..." | tee -a $LOG_FILE
    
    if [ -f "cleanup-coordination.md" ]; then
        # Count completed tasks per agent
        DEPS_COMPLETED=$(grep -c "\[x\]" cleanup-coordination.md | head -1 || echo "0")
        log_result "📋 Agent coordination file updated"
    else
        log_result "⚠️  Warning: Coordination file not found"
    fi
}

# Function for emergency response
emergency_response() {
    echo "🚨🚨🚨 EMERGENCY RESPONSE ACTIVATED 🚨🚨🚨" | tee -a $LOG_FILE
    echo "Time: $TIMESTAMP" | tee -a $LOG_FILE
    echo "Issue: $1" | tee -a $LOG_FILE
    echo "" | tee -a $LOG_FILE
    echo "IMMEDIATE ACTIONS REQUIRED:" | tee -a $LOG_FILE
    echo "1. STOP ALL CLEANUP AGENTS IMMEDIATELY" | tee -a $LOG_FILE
    echo "2. DO NOT MAKE ANY MORE CHANGES" | tee -a $LOG_FILE
    echo "3. INVESTIGATE THE ISSUE" | tee -a $LOG_FILE
    echo "4. CONSIDER ROLLING BACK RECENT CHANGES" | tee -a $LOG_FILE
    echo "" | tee -a $LOG_FILE
    echo "Git status:" | tee -a $LOG_FILE
    git status | tee -a $LOG_FILE
    echo "" | tee -a $LOG_FILE
    echo "Recent commits:" | tee -a $LOG_FILE
    git log --oneline -5 | tee -a $LOG_FILE
}

# Main monitoring logic
case $MODE in
    "quick")
        echo "⚡ Quick monitoring check" | tee -a $LOG_FILE
        check_build
        BUILD_STATUS=$?
        check_coordination
        
        if [ $BUILD_STATUS -ne 0 ]; then
            emergency_response "Build failure detected"
            exit 1
        fi
        ;;
        
    "full")
        echo "🔍 Full monitoring check" | tee -a $LOG_FILE
        check_build
        BUILD_STATUS=$?
        check_tests  
        TEST_STATUS=$?
        check_lint
        check_coordination
        
        if [ $BUILD_STATUS -ne 0 ] || [ $TEST_STATUS -ne 0 ]; then
            emergency_response "Critical system failure detected"
            exit 1
        fi
        ;;
        
    "emergency")
        echo "🚨 Emergency system check" | tee -a $LOG_FILE
        emergency_response "Manual emergency check requested"
        exit 1
        ;;
        
    *)
        echo "Usage: $0 [quick|full|emergency]"
        exit 1
        ;;
esac

echo "✅ Monitoring check completed successfully" | tee -a $LOG_FILE
echo "Next check: $(date -d '+30 minutes' '+%Y-%m-%d %H:%M:%S UTC' 2>/dev/null || date '+%Y-%m-%d %H:%M:%S UTC')" | tee -a $LOG_FILE
echo "" | tee -a $LOG_FILE

# Cleanup temp files
rm -f build-temp.log test-temp.json

exit 0