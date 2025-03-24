// Global variables
let processes = [];
const colors = [
    'bg-blue-500', 'bg-red-500', 'bg-green-500', 'bg-yellow-500', 
    'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500',
    'bg-orange-500', 'bg-cyan-500', 'bg-emerald-500', 'bg-violet-500'
];
let animationInterval;
let animationCurrentTime = 0;
let isAnimating = false;
let fullSchedule = []; // Store the complete schedule for reference

// DOM Elements
const addProcessBtn = document.getElementById('addProcess');
const processNameInput = document.getElementById('processName');
const arrivalTimeInput = document.getElementById('arrivalTime');
const burstTimeInput = document.getElementById('burstTime');
const processTable = document.getElementById('processTable');
const algorithmSelect = document.getElementById('algorithm');
const timeQuantumContainer = document.getElementById('timeQuantumContainer');
const timeQuantumInput = document.getElementById('timeQuantum');
const maxTimeInput = document.getElementById('maxTime');
const runAlgorithmBtn = document.getElementById('runAlgorithm');
const ganttChartContainer = document.getElementById('ganttChartContainer');
const ganttChart = document.getElementById('ganttChart');
const resultsContainer = document.getElementById('results');
const animationSpeedInput = document.getElementById('animationSpeed');
const playAnimationBtn = document.getElementById('playAnimation');
const pauseAnimationBtn = document.getElementById('pauseAnimation');
const resetAnimationBtn = document.getElementById('resetAnimation');
const timeIndicator = document.getElementById('currentTimeIndicator');

// Event listeners
addProcessBtn.addEventListener('click', addProcess);
algorithmSelect.addEventListener('change', toggleTimeQuantum);
runAlgorithmBtn.addEventListener('click', runAlgorithm);
playAnimationBtn.addEventListener('click', playAnimation);
pauseAnimationBtn.addEventListener('click', pauseAnimation);
resetAnimationBtn.addEventListener('click', resetAnimation);

// Toggle time quantum input for Round Robin
function toggleTimeQuantum() {
    if (algorithmSelect.value === 'rr') {
        timeQuantumContainer.classList.remove('hidden');
    } else {
        timeQuantumContainer.classList.add('hidden');
    }
}

// Add process to the list
function addProcess() {
    const name = processNameInput.value.trim() || `P${processes.length + 1}`;
    const arrivalTime = parseInt(arrivalTimeInput.value) || 0;
    const burstTime = parseInt(burstTimeInput.value);
    
    if (!burstTime || burstTime <= 0) {
        alert('Please enter a valid burst time.');
        return;
    }
    
    const process = {
        id: Date.now(),
        name,
        arrivalTime,
        burstTime,
        remainingTime: burstTime,
        color: colors[processes.length % colors.length]
    };
    
    processes.push(process);
    updateProcessTable();
    
    // Clear inputs
    processNameInput.value = '';
    arrivalTimeInput.value = '';
    burstTimeInput.value = '';
    processNameInput.focus();
}

// Update process table
function updateProcessTable() {
    processTable.innerHTML = '';
    processes.forEach((process) => {
        const row = document.createElement('tr');
        
        // Add color indicator
        const colorClass = process.color.replace('bg-', 'text-');
        
        row.innerHTML = `
            <td class="py-2 px-4 border">
                <span class="font-bold ${colorClass}">■</span> ${process.name}
            </td>
            <td class="py-2 px-4 border">${process.arrivalTime}</td>
            <td class="py-2 px-4 border">${process.burstTime}</td>
            <td class="py-2 px-4 border">
                <button class="delete-btn text-red-500 hover:text-red-700" data-id="${process.id}">Delete</button>
            </td>
        `;
        processTable.appendChild(row);
    });
    
    // Add delete event listeners
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const id = parseInt(this.getAttribute('data-id'));
            processes = processes.filter(p => p.id !== id);
            updateProcessTable();
        });
    });
}

// Animation controls functions
function playAnimation() {
    if (isAnimating) return;
    
    const speed = parseFloat(animationSpeedInput.value) || 1;
    const timeStep = 1000 / speed; // Convert to milliseconds
    
    isAnimating = true;
    playAnimationBtn.disabled = true;
    pauseAnimationBtn.disabled = false;
    
    animationInterval = setInterval(() => {
        animationCurrentTime += 0.1; // Increment by 1/10th of a second for smoother animation
        updateAnimationState();
        
        // Stop animation when it reaches the max time
        const maxTime = parseInt(maxTimeInput.value) || 20;
        if (animationCurrentTime >= maxTime) {
            pauseAnimation();
            // Show final metrics when animation completes
            calculateMetrics(fullSchedule);
        }
    }, timeStep / 10);
}

function pauseAnimation() {
    clearInterval(animationInterval);
    isAnimating = false;
    playAnimationBtn.disabled = false;
    pauseAnimationBtn.disabled = true;
}

function resetAnimation() {
    pauseAnimation();
    animationCurrentTime = 0;
    updateAnimationState();
    // Clear the results when animation is reset
    resultsContainer.innerHTML = '<p class="text-center">Animation in progress. Results will be displayed when animation completes.</p>';
}

function updateAnimationState() {
    // Update the time indicator position
    const containerWidth = ganttChartContainer.clientWidth - 40;
    const maxTime = parseInt(maxTimeInput.value) || 20;
    const timeUnitWidth = containerWidth / maxTime;
    
    // Update current time display
    timeIndicator.textContent = `Current Time: ${animationCurrentTime.toFixed(1)}`;
    
    // Update time marker position
    const timeMarker = document.getElementById('animationTimeMarker');
    if (timeMarker) {
        timeMarker.style.left = `${80 + animationCurrentTime * timeUnitWidth}px`;
    }
    
    // Update process blocks visibility based on current time
    document.querySelectorAll('.process-block').forEach(block => {
        const startTime = parseFloat(block.dataset.startTime);
        const endTime = parseFloat(block.dataset.endTime);
        
        // Only display blocks up to the current animation time
        if (startTime <= animationCurrentTime) {
            block.style.display = 'flex';
            
            // Adjust width for blocks that are still in progress
            if (endTime > animationCurrentTime) {
                const adjustedWidth = (animationCurrentTime - startTime) * timeUnitWidth;
                block.style.width = `${adjustedWidth}px`;
                
                // Highlight the current active process
                block.classList.add('active-process');
                block.classList.remove('inactive-process');
            } else {
                // Process is complete
                block.style.width = `${(endTime - startTime) * timeUnitWidth}px`;
                block.classList.add('inactive-process');
                block.classList.remove('active-process');
            }
        } else {
            // Future process - hide it
            block.style.display = 'none';
        }
    });
    
    // Update the current process indicator
    updateCurrentProcessIndicator();
}

// Show which process is currently executing
function updateCurrentProcessIndicator() {
    const currentTimeExact = animationCurrentTime;
    
    // Find the process running at the current time
    const currentExecution = fullSchedule.find(item => 
        item.start <= currentTimeExact && item.end > currentTimeExact
    );
    
    // Update a display element to show the current process
    const processIndicator = document.getElementById('currentProcessIndicator');
    if (processIndicator) {
        if (currentExecution) {
            const processColor = currentExecution.color.replace('bg-', 'text-');
            processIndicator.innerHTML = `
                <span class="font-bold ${processColor}">■</span> 
                Current Process: <span class="font-bold">${currentExecution.process}</span>
            `;
        } else {
            processIndicator.innerHTML = 'No process running';
        }
    }
}

// Run selected algorithm
function runAlgorithm() {
    // Reset animation
    resetAnimation();
    
    if (processes.length === 0) {
        alert('Please add at least one process.');
        return;
    }
    
    let schedule = [];
    const algorithm = algorithmSelect.value;
    
    // Reset remaining time for each process
    processes.forEach(process => {
        process.remainingTime = process.burstTime;
    });
    
    switch (algorithm) {
        case 'fcfs':
            schedule = runFCFS();
            break;
        case 'sjf':
            schedule = runSJF();
            break;
        case 'srtn':
            schedule = runSRTN();
            break;
        case 'rr':
            const timeQuantum = parseInt(timeQuantumInput.value);
            if (!timeQuantum || timeQuantum <= 0) {
                alert('Please enter a valid time quantum.');
                return;
            }
            schedule = runRR(timeQuantum);
            break;
    }
    
    // Store the full schedule for reference
    fullSchedule = schedule;
    
    // Initialize the Gantt chart (but don't show blocks yet)
    initializeGanttChart(schedule);
    
    // Display a waiting message
    resultsContainer.innerHTML = '<p class="text-center">Animation in progress. Results will be displayed when animation completes.</p>';
}

// First-Come First-Serve algorithm
function runFCFS() {
    // Sort processes by arrival time
    const sortedProcesses = [...processes].sort((a, b) => a.arrivalTime - b.arrivalTime);
    let currentTime = 0;
    const schedule = [];
    
    sortedProcesses.forEach(process => {
        // If there's a gap between processes
        if (process.arrivalTime > currentTime) {
            // Add idle time
            schedule.push({
                process: 'Idle',
                start: currentTime,
                end: process.arrivalTime,
                color: 'bg-gray-300'
            });
            currentTime = process.arrivalTime;
        }
        
        // Process execution (create a timeline entry for each time unit)
        schedule.push({
            process: process.name,
            start: currentTime,
            end: currentTime + process.burstTime,
            color: process.color
        });
        
        currentTime += process.burstTime;
    });
    
    return schedule;
}

// Shortest Job First algorithm (non-preemptive)
function runSJF() {
    let currentTime = 0;
    const schedule = [];
    const processQueue = [...processes].map(p => ({...p}));
    
    // Sort initially by arrival time
    processQueue.sort((a, b) => a.arrivalTime - b.arrivalTime);
    
    while (processQueue.length > 0) {
        // Find arrived processes
        const arrivedProcesses = processQueue.filter(p => p.arrivalTime <= currentTime);
        
        if (arrivedProcesses.length === 0) {
            // No processes available, add idle time
            const nextArrival = processQueue[0].arrivalTime;
            schedule.push({
                process: 'Idle',
                start: currentTime,
                end: nextArrival,
                color: 'bg-gray-300'
            });
            currentTime = nextArrival;
            continue;
        }
        
        // Find shortest job among arrived processes
        arrivedProcesses.sort((a, b) => a.burstTime - b.burstTime);
        const shortestJob = arrivedProcesses[0];
        
        // Process execution
        schedule.push({
            process: shortestJob.name,
            start: currentTime,
            end: currentTime + shortestJob.burstTime,
            color: shortestJob.color
        });
        
        currentTime += shortestJob.burstTime;
        
        // Remove the processed job
        const index = processQueue.findIndex(p => p.id === shortestJob.id);
        processQueue.splice(index, 1);
    }
    
    return schedule;
}

// Shortest Remaining Time Next algorithm (preemptive)
function runSRTN() {
    let currentTime = 0;
    const schedule = [];
    const processQueue = [...processes].map(p => ({...p}));
    
    // Sort initially by arrival time
    processQueue.sort((a, b) => a.arrivalTime - b.arrivalTime);
    
    // If no processes, return empty schedule
    if (processQueue.length === 0) {
        return schedule;
    }
    
    // Initialize with the first arrival time if it's greater than 0
    if (processQueue[0].arrivalTime > 0) {
        schedule.push({
            process: 'Idle',
            start: 0,
            end: processQueue[0].arrivalTime,
            color: 'bg-gray-300'
        });
        currentTime = processQueue[0].arrivalTime;
    }
    
    // Continue until all processes are completed
    let lastProcess = null;
    
    while (processQueue.some(p => p.remainingTime > 0)) {
        // Get arrived processes with remaining time
        const availableProcesses = processQueue.filter(
            p => p.arrivalTime <= currentTime && p.remainingTime > 0
        );
        
        if (availableProcesses.length === 0) {
            // Find next process to arrive
            const nextProcess = processQueue
                .filter(p => p.remainingTime > 0)
                .sort((a, b) => a.arrivalTime - b.arrivalTime)[0];
            
            // Add idle time
            schedule.push({
                process: 'Idle',
                start: currentTime,
                end: nextProcess.arrivalTime,
                color: 'bg-gray-300'
            });
            
            currentTime = nextProcess.arrivalTime;
            continue;
        }
        
        // Find process with shortest remaining time
        const srtnProcess = availableProcesses.sort((a, b) => a.remainingTime - b.remainingTime)[0];
        
        // Check if a new process will arrive before current one finishes
        const nextArrivalTime = processQueue
            .filter(p => p.arrivalTime > currentTime && p.remainingTime > 0)
            .map(p => p.arrivalTime)
            .sort((a, b) => a - b)[0] || Infinity;
        
        // Calculate how long the current process will run
        const runTime = Math.min(
            srtnProcess.remainingTime,
            nextArrivalTime !== Infinity ? nextArrivalTime - currentTime : srtnProcess.remainingTime
        );
        
        // Add to schedule
        schedule.push({
            process: srtnProcess.name,
            start: currentTime,
            end: currentTime + runTime,
            color: srtnProcess.color
        });
        
        // Update process remaining time
        srtnProcess.remainingTime -= runTime;
        currentTime += runTime;
    }
    
    return schedule;
}

// Round Robin algorithm
function runRR(timeQuantum) {
    let currentTime = 0;
    const schedule = [];
    const processQueue = [...processes].map(p => ({...p}));
    
    // Sort initially by arrival time
    processQueue.sort((a, b) => a.arrivalTime - b.arrivalTime);
    
    // If no processes, return empty schedule
    if (processQueue.length === 0) {
        return schedule;
    }
    
    // Initialize with the first arrival time if it's greater than 0
    if (processQueue[0].arrivalTime > 0) {
        schedule.push({
            process: 'Idle',
            start: 0,
            end: processQueue[0].arrivalTime,
            color: 'bg-gray-300'
        });
        currentTime = processQueue[0].arrivalTime;
    }
    
    const readyQueue = [];
    
    // Continue until all processes are completed
    while (processQueue.some(p => p.remainingTime > 0) || readyQueue.length > 0) {
        // Move arrived processes to ready queue
        const newArrivals = processQueue.filter(
            p => p.arrivalTime <= currentTime && p.remainingTime > 0 && !readyQueue.includes(p)
        );
        
        readyQueue.push(...newArrivals);
        
        if (readyQueue.length === 0) {
            // Find next process to arrive
            const nextProcess = processQueue
                .filter(p => p.remainingTime > 0)
                .sort((a, b) => a.arrivalTime - b.arrivalTime)[0];
            
            if (!nextProcess) break;
            
            // Add idle time
            schedule.push({
                process: 'Idle',
                start: currentTime,
                end: nextProcess.arrivalTime,
                color: 'bg-gray-300'
            });
            
            currentTime = nextProcess.arrivalTime;
            continue;
        }
        
        // Get the next process from ready queue
        const currentProcess = readyQueue.shift();
        
        // Calculate execution time for this quantum
        const executionTime = Math.min(timeQuantum, currentProcess.remainingTime);
        
        // Add to schedule
        schedule.push({
            process: currentProcess.name,
            start: currentTime,
            end: currentTime + executionTime,
            color: currentProcess.color
        });
        
        currentTime += executionTime;
        currentProcess.remainingTime -= executionTime;
        
        // Move newly arrived processes to ready queue
        const newArrivalsAfter = processQueue.filter(
            p => p.arrivalTime <= currentTime && p.remainingTime > 0 && 
            !readyQueue.includes(p) && p.id !== currentProcess.id
        );
        
        readyQueue.push(...newArrivalsAfter);
        
        // If current process is not finished, add it back to the ready queue
        if (currentProcess.remainingTime > 0) {
            readyQueue.push(currentProcess);
        }
    }
    
    return schedule;
}

// Initialize Gantt chart structure (without showing blocks yet)
function initializeGanttChart(schedule) {
    ganttChart.innerHTML = '';
    
    if (schedule.length === 0) {
        ganttChart.innerHTML = '<p class="text-center p-4">No schedule to display.</p>';
        return;
    }
    
    // Reset animation
    resetAnimation();
    
    const maxTime = parseInt(maxTimeInput.value) || 20;
    const containerWidth = ganttChartContainer.clientWidth - 40; // Accounting for padding
    const timeUnitWidth = containerWidth / maxTime;
    
    // Create grid container
    const gridContainer = document.createElement('div');
    gridContainer.className = 'relative w-full h-full';
    gridContainer.style.height = '250px';
    
    // Add time markers and grid lines
    for (let t = 0; t <= maxTime; t++) {
        // Time marker
        const timeMarker = document.createElement('div');
        timeMarker.className = `time-marker ${t % 5 === 0 ? 'multiple-five' : ''}`;
        timeMarker.style.left = `${t * timeUnitWidth}px`;
        timeMarker.textContent = t;
        gridContainer.appendChild(timeMarker);
        
        // Grid line
        const gridLine = document.createElement('div');
        gridLine.className = `time-line ${t % 5 === 0 ? 'multiple-five' : ''}`;
        gridLine.style.left = `${t * timeUnitWidth}px`;
        gridContainer.appendChild(gridLine);
    }
    
    // Add animation time marker
    const animationMarker = document.createElement('div');
    animationMarker.id = 'animationTimeMarker';
    animationMarker.className = 'animation-time-marker';
    animationMarker.style.left = `${80}px`; // Start at 0
    gridContainer.appendChild(animationMarker);
    
    // Add current process indicator (new!)
    const processIndicatorContainer = document.createElement('div');
    processIndicatorContainer.className = 'absolute top-0 left-0 p-2 bg-white border border-gray-300 rounded shadow-sm z-20';
    processIndicatorContainer.id = 'currentProcessIndicator';
    processIndicatorContainer.innerHTML = 'No process running';
    gridContainer.appendChild(processIndicatorContainer);
    
    // Filter schedule to only include entries within the max time
    const filteredSchedule = schedule.filter(item => item.start < maxTime);
    
    // Process names to create one row per process
    const processNames = [...new Set(filteredSchedule.map(s => s.process))];
    
    // Calculate row height
    const rowHeight = 180 / processNames.length;
    
    // Create process rows
    processNames.forEach((processName, index) => {
        const processItems = filteredSchedule.filter(item => item.process === processName);
        
        // Process label (left side)
        const label = document.createElement('div');
        label.className = 'absolute bg-gray-200 p-2 flex items-center justify-center font-bold border-r border-gray-300';
        label.style.left = '0';
        label.style.top = `${index * rowHeight}px`;
        label.style.height = `${rowHeight}px`;
        label.style.width = '80px';
        label.style.zIndex = '10';
        label.textContent = processName;
        gridContainer.appendChild(label);
        
        // Create timeline for the entire duration (0 to maxTime)
        // First, add a background track for the process
        const track = document.createElement('div');
        track.className = 'process-track bg-gray-100';
        track.style.left = `80px`;
        track.style.top = `${index * rowHeight}px`;
        track.style.width = `${maxTime * timeUnitWidth}px`;
        track.style.height = `${rowHeight}px`;
        gridContainer.appendChild(track);
        
        // Create process blocks but initially hide them
        // They will be shown progressively during animation
        processItems.forEach(item => {
            // Ensure end time doesn't exceed max time
            const adjustedEnd = Math.min(item.end, maxTime);
            
            if (item.start >= maxTime) return;
            
            const block = document.createElement('div');
            block.className = `process-block ${item.color} border border-white`;
            block.style.left = `${80 + item.start * timeUnitWidth}px`;
            block.style.top = `${index * rowHeight}px`;
            block.style.width = `${(adjustedEnd - item.start) * timeUnitWidth}px`;
            block.style.height = `${rowHeight}px`;
            block.style.display = 'none'; // Initially hidden
            block.dataset.startTime = item.start;
            block.dataset.endTime = adjustedEnd;
            block.textContent = processName;
            gridContainer.appendChild(block);
        });
    });
    
    ganttChart.appendChild(gridContainer);
}

// Calculate and display metrics
function calculateMetrics(schedule) {
    if (schedule.length === 0) {
        resultsContainer.innerHTML = '<p class="text-center">No results to display.</p>';
        return;
    }
    
    // Group schedule by process name
    const processGroups = {};
    
    schedule.forEach(item => {
        if (item.process === 'Idle') return;
        
        if (!processGroups[item.process]) {
            processGroups[item.process] = [];
        }
        
        processGroups[item.process].push(item);
    });
    
    // Calculate metrics for each process
    const metrics = {};
    
    for (const processName in processGroups) {
        const items = processGroups[processName];
        const process = processes.find(p => p.name === processName);
        
        if (!process) continue;
        
        // Sort by start time to find first and last execution
        items.sort((a, b) => a.start - b.start);
        
        const firstExecution = items[0];
        const lastExecution = items[items.length - 1];
        
        // Calculate waiting time and turnaround time
        const arrivalTime = process.arrivalTime;
        const completionTime = lastExecution.end;
        const burstTime = process.burstTime;
        
        const turnaroundTime = completionTime - arrivalTime;
        const waitingTime = turnaroundTime - burstTime;
        
        metrics[processName] = {
            arrivalTime,
            burstTime,
            completionTime,
            turnaroundTime,
            waitingTime
        };
    }
    
    // Calculate averages
    let totalTurnaroundTime = 0;
    let totalWaitingTime = 0;
    let processCount = Object.keys(metrics).length;
    
    for (const processName in metrics) {
        totalTurnaroundTime += metrics[processName].turnaroundTime;
        totalWaitingTime += metrics[processName].waitingTime;
    }
    
    const avgTurnaroundTime = processCount > 0 ? totalTurnaroundTime / processCount : 0;
    const avgWaitingTime = processCount > 0 ? totalWaitingTime / processCount : 0;
    
    // Create results table
    let resultsHTML = `
        <div class="overflow-x-auto">
            <table class="min-w-full bg-white border mb-4">
                <thead>
                    <tr class="bg-gray-200">
                        <th class="py-2 px-4 border">Process</th>
                        <th class="py-2 px-4 border">Arrival Time</th>
                        <th class="py-2 px-4 border">Burst Time</th>
                        <th class="py-2 px-4 border">Completion Time</th>
                        <th class="py-2 px-4 border">Turnaround Time</th>
                        <th class="py-2 px-4 border">Waiting Time</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    for (const processName in metrics) {
        const m = metrics[processName];
        resultsHTML += `
            <tr>
                <td class="py-2 px-4 border">${processName}</td>
                <td class="py-2 px-4 border">${m.arrivalTime}</td>
                <td class="py-2 px-4 border">${m.burstTime}</td>
                <td class="py-2 px-4 border">${m.completionTime}</td>
                <td class="py-2 px-4 border">${m.turnaroundTime}</td>
                <td class="py-2 px-4 border">${m.waitingTime}</td>
            </tr>
        `;
    }
    
    resultsHTML += `
                </tbody>
            </table>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="bg-blue-50 p-4 rounded">
                <h3 class="font-bold text-lg">Average Turnaround Time</h3>
                <p class="text-2xl">${avgTurnaroundTime.toFixed(2)}</p>
            </div>
            <div class="bg-green-50 p-4 rounded">
                <h3 class="font-bold text-lg">Average Waiting Time</h3>
                <p class="text-2xl">${avgWaitingTime.toFixed(2)}</p>
            </div>
        </div>
    `;
    
    resultsContainer.innerHTML = resultsHTML;
}

// Initialize the page
function init() {
    // Show time quantum input if Round Robin is selected
    toggleTimeQuantum();
    
    // Add some example processes
    if (processes.length === 0) {
        processes = [
            {
                id: 1,
                name: 'P1',
                arrivalTime: 0,
                burstTime: 5,
                remainingTime: 5,
                color: colors[0]
            },
            {
                id: 2,
                name: 'P2',
                arrivalTime: 1,
                burstTime: 3,
                remainingTime: 3,
                color: colors[1]
            },
            {
                id: 3,
                name: 'P3',
                arrivalTime: 2,
                burstTime: 8,
                remainingTime: 8,
                color: colors[2]
            },
            {
                id: 4,
                name: 'P4',
                arrivalTime: 4,
                burstTime: 4,
                remainingTime: 4,
                color: colors[3]
            }
        ];
        updateProcessTable();
    }
}

// Start initialization when the page loads
window.addEventListener('load', init);