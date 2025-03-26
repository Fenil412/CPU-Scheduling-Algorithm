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
let fullSchedule = [];
let maxEndTime;
const pixelsPerSecond = 20;

// DOM Elements
const addProcessBtn = document.getElementById('addProcess');
const processNameInput = document.getElementById('processName');
const arrivalTimeInput = document.getElementById('arrivalTime');
const burstTimeInput = document.getElementById('burstTime');
const processTable = document.getElementById('processTable');
const algorithmSelect = document.getElementById('algorithm');
const timeQuantumContainer = document.getElementById('timeQuantumContainer');
const timeQuantumInput = document.getElementById('timeQuantum');
const runAlgorithmBtn = document.getElementById('runAlgorithm');
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



// Function to add a new process
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
        color: colors[processes.length % colors.length],
    };

    processes.push(process);
    updateProcessTable();

    // Clear input fields
    processNameInput.value = '';
    arrivalTimeInput.value = '';
    burstTimeInput.value = '';
    processNameInput.focus();
}

function updateProcessTable() {
    processTable.innerHTML = '';
    processes.forEach((process) => {
        const row = document.createElement('tr');
        const colorClass = process.color.replace('bg-', 'text-');
        row.innerHTML = `
            <td class="py-2 px-4 border">
                <span class="font-bold ${colorClass}">■</span> ${process.name}
            </td>
            <td class="py-2 px-4 border">${process.arrivalTime}</td>
            <td class="py-2 px-4 border">${process.burstTime}</td>
            <td class="py-2 px-4 border">
                <button class="update-btn text-blue-500 hover:text-blue-700 mr-2" data-id="${process.id}">Update</button>
                <button class="delete-btn text-red-500 hover:text-red-700" data-id="${process.id}">Delete</button>
            </td>
        `;
        processTable.appendChild(row);
    });

    // Add event listeners for delete buttons
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            const id = parseInt(this.getAttribute('data-id'));
            processes = processes.filter(p => p.id !== id);
            updateProcessTable();
        });
    });

    // Add event listeners for update buttons
    document.querySelectorAll('.update-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            const id = parseInt(this.getAttribute('data-id'));
            const process = processes.find(p => p.id === id);
            if (process) {
                // Populate input fields with process data
                processNameInput.value = process.name;
                arrivalTimeInput.value = process.arrivalTime;
                burstTimeInput.value = process.burstTime;
                
                // Remove the original process
                processes = processes.filter(p => p.id !== id);
                updateProcessTable();
            }
        });
    });
}

// Animation controls functions
function playAnimation() {
    if (isAnimating) return;

    const speed = parseFloat(animationSpeedInput.value) || 1;
    const timeStep = 1000 / speed;

    isAnimating = true;
    playAnimationBtn.disabled = true;
    pauseAnimationBtn.disabled = false;

    animationInterval = setInterval(() => {
        animationCurrentTime += 0.1;
        updateAnimationState();

        if (animationCurrentTime >= maxEndTime) {
            pauseAnimation();
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
    resultsContainer.innerHTML = '<p class="text-center">Animation in progress. Results will be displayed when animation completes.</p>';
}

function updateAnimationState() {
    timeIndicator.textContent = `Current Time: ${animationCurrentTime.toFixed(1)}`;

    const timeMarker = document.getElementById('animationTimeMarker');
    if (timeMarker) {
        timeMarker.style.left = `${80 + animationCurrentTime * window.pixelsPerSecond}px`;
    }

    document.querySelectorAll('.process-block').forEach(block => {
        const startTime = parseFloat(block.dataset.startTime);
        const endTime = parseFloat(block.dataset.endTime);

        if (startTime <= animationCurrentTime) {
            block.style.display = 'flex';

            if (endTime > animationCurrentTime) {
                const adjustedWidth = (animationCurrentTime - startTime) * window.pixelsPerSecond;
                block.style.width = `${adjustedWidth}px`;
                block.classList.add('active-process');
                block.classList.remove('inactive-process');
            } else {
                block.style.width = `${(endTime - startTime) * window.pixelsPerSecond}px`;
                block.classList.add('inactive-process');
                block.classList.remove('active-process');
            }
        } else {
            block.style.display = 'none';
        }
    });

    updateCurrentProcessIndicator();
}

function updateCurrentProcessIndicator() {
    const currentTimeExact = animationCurrentTime;
    const currentExecution = fullSchedule.find(item =>
        item.start <= currentTimeExact && item.end > currentTimeExact
    );
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

// Algorithm implementations
function runFCFS() {
    const sortedProcesses = [...processes].sort((a, b) => a.arrivalTime - b.arrivalTime);
    let currentTime = 0;
    const schedule = [];

    sortedProcesses.forEach(process => {
        if (process.arrivalTime > currentTime) {
            schedule.push({
                process: 'Idle',
                start: currentTime,
                end: process.arrivalTime,
                color: 'bg-gray-300'
            });
            currentTime = process.arrivalTime;
        }
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

function runSJF() {
    let currentTime = 0;
    const schedule = [];
    const processQueue = [...processes].map(p => ({ ...p }));

    processQueue.sort((a, b) => a.arrivalTime - b.arrivalTime);

    while (processQueue.length > 0) {
        const arrivedProcesses = processQueue.filter(p => p.arrivalTime <= currentTime);

        if (arrivedProcesses.length === 0) {
            const nextArrival = process

            Queue[0].arrivalTime;
            schedule.push({
                process: 'Idle',
                start: currentTime,
                end: nextArrival,
                color: 'bg-gray-300'
            });
            currentTime = nextArrival;
            continue;
        }

        arrivedProcesses.sort((a, b) => a.burstTime - b.burstTime);
        const shortestJob = arrivedProcesses[0];

        schedule.push({
            process: shortestJob.name,
            start: currentTime,
            end: currentTime + shortestJob.burstTime,
            color: shortestJob.color
        });

        currentTime += shortestJob.burstTime;
        const index = processQueue.findIndex(p => p.id === shortestJob.id);
        processQueue.splice(index, 1);
    }
    return schedule;
}

function runSRTN() {
    let currentTime = 0;
    const schedule = [];
    const processQueue = [...processes].map(p => ({ ...p }));

    processQueue.sort((a, b) => a.arrivalTime - b.arrivalTime);

    if (processQueue.length === 0) return schedule;

    if (processQueue[0].arrivalTime > 0) {
        schedule.push({
            process: 'Idle',
            start: 0,
            end: processQueue[0].arrivalTime,
            color: 'bg-gray-300'
        });
        currentTime = processQueue[0].arrivalTime;
    }

    while (processQueue.some(p => p.remainingTime > 0)) {
        const availableProcesses = processQueue.filter(
            p => p.arrivalTime <= currentTime && p.remainingTime > 0
        );

        if (availableProcesses.length === 0) {
            const nextProcess = processQueue
                .filter(p => p.remainingTime > 0)
                .sort((a, b) => a.arrivalTime - b.arrivalTime)[0];
            schedule.push({
                process: 'Idle',
                start: currentTime,
                end: nextProcess.arrivalTime,
                color: 'bg-gray-300'
            });
            currentTime = nextProcess.arrivalTime;
            continue;
        }

        const srtnProcess = availableProcesses.sort((a, b) => a.remainingTime - b.remainingTime)[0];
        const nextArrivalTime = processQueue
            .filter(p => p.arrivalTime > currentTime && p.remainingTime > 0)
            .map(p => p.arrivalTime)
            .sort((a, b) => a - b)[0] || Infinity;

        const runTime = Math.min(
            srtnProcess.remainingTime,
            nextArrivalTime !== Infinity ? nextArrivalTime - currentTime : srtnProcess.remainingTime
        );

        schedule.push({
            process: srtnProcess.name,
            start: currentTime,
            end: currentTime + runTime,
            color: srtnProcess.color
        });

        srtnProcess.remainingTime -= runTime;
        currentTime += runTime;
    }
    return schedule;
}

function runRR(timeQuantum) {
    let currentTime = 0;
    const schedule = [];
    const processQueue = [...processes].map(p => ({ ...p }));

    processQueue.sort((a, b) => a.arrivalTime - b.arrivalTime);

    if (processQueue.length === 0) return schedule;

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

    while (processQueue.some(p => p.remainingTime > 0) || readyQueue.length > 0) {
        const newArrivals = processQueue.filter(
            p => p.arrivalTime <= currentTime && p.remainingTime > 0 && !readyQueue.includes(p)
        );
        readyQueue.push(...newArrivals);

        if (readyQueue.length === 0) {
            const nextProcess = processQueue
                .filter(p => p.remainingTime > 0)
                .sort((a, b) => a.arrivalTime - b.arrivalTime)[0];
            if (!nextProcess) break;
            schedule.push({
                process: 'Idle',
                start: currentTime,
                end: nextProcess.arrivalTime,
                color: 'bg-gray-300'
            });
            currentTime = nextProcess.arrivalTime;
            continue;
        }

        const currentProcess = readyQueue.shift();
        const executionTime = Math.min(timeQuantum, currentProcess.remainingTime);

        schedule.push({
            process: currentProcess.name,
            start: currentTime,
            end: currentTime + executionTime,
            color: currentProcess.color
        });

        currentTime += executionTime;
        currentProcess.remainingTime -= executionTime;

        const newArrivalsAfter = processQueue.filter(
            p => p.arrivalTime <= currentTime && p.remainingTime > 0 &&
                !readyQueue.includes(p) && p.id !== currentProcess.id
        );
        readyQueue.push(...newArrivalsAfter);

        if (currentProcess.remainingTime > 0) {
            readyQueue.push(currentProcess);
        }
    }
    return schedule;
}

// Updated algorithm implementations

function runLJF() {
    let currentTime = 0;
    const schedule = [];
    const processQueue = [...processes].map(p => ({ 
        ...p, 
        priority: p.priority || Math.floor(Math.random() * 10) + 1 // Default random priority if not specified
    }));

    processQueue.sort((a, b) => a.arrivalTime - b.arrivalTime);

    while (processQueue.length > 0) {
        const arrivedProcesses = processQueue.filter(p => p.arrivalTime <= currentTime);

        if (arrivedProcesses.length === 0) {
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

        arrivedProcesses.sort((a, b) => b.burstTime - a.burstTime);
        const longestJob = arrivedProcesses[0];

        schedule.push({
            process: longestJob.name,
            start: currentTime,
            end: currentTime + longestJob.burstTime,
            color: longestJob.color
        });

        currentTime += longestJob.burstTime;
        const index = processQueue.findIndex(p => p.id === longestJob.id);
        processQueue.splice(index, 1);
    }
    return schedule;
}

function runLRJF() {
    let currentTime = 0;
    const schedule = [];
    const processQueue = [...processes].map(p => ({ 
        ...p, 
        priority: p.priority || Math.floor(Math.random() * 10) + 1, // Default random priority if not specified
        remainingTime: p.burstTime 
    }));

    processQueue.sort((a, b) => a.arrivalTime - b.arrivalTime);

    if (processQueue.length === 0) return schedule;

    if (processQueue[0].arrivalTime > 0) {
        schedule.push({
            process: 'Idle',
            start: 0,
            end: processQueue[0].arrivalTime,
            color: 'bg-gray-300'
        });
        currentTime = processQueue[0].arrivalTime;
    }

    while (processQueue.some(p => p.remainingTime > 0)) {
        const availableProcesses = processQueue.filter(
            p => p.arrivalTime <= currentTime && p.remainingTime > 0
        );

        if (availableProcesses.length === 0) {
            const nextProcess = processQueue
                .filter(p => p.remainingTime > 0)
                .sort((a, b) => a.arrivalTime - b.arrivalTime)[0];
            schedule.push({
                process: 'Idle',
                start: currentTime,
                end: nextProcess.arrivalTime,
                color: 'bg-gray-300'
            });
            currentTime = nextProcess.arrivalTime;
            continue;
        }

        const lrjfProcess = availableProcesses.sort((a, b) => b.remainingTime - a.remainingTime)[0];
        const nextArrivalTime = processQueue
            .filter(p => p.arrivalTime > currentTime && p.remainingTime > 0)
            .map(p => p.arrivalTime)
            .sort((a, b) => a - b)[0] || Infinity;

        const runTime = Math.min(
            lrjfProcess.remainingTime,
            nextArrivalTime !== Infinity ? nextArrivalTime - currentTime : lrjfProcess.remainingTime
        );

        schedule.push({
            process: lrjfProcess.name,
            start: currentTime,
            end: currentTime + runTime,
            color: lrjfProcess.color
        });

        lrjfProcess.remainingTime -= runTime;
        currentTime += runTime;
    }
    return schedule;
}

// Update the existing algorithm check in runAlgorithm function
function runAlgorithm() {
    resetAnimation();

    if (processes.length === 0) {
        alert('Please add at least one process.');
        return;
    }

    let schedule = [];
    const algorithm = algorithmSelect.value;

    // Reset remaining time for all processes
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
        case 'ljf':
            schedule = runLJF();
            break;
        case 'lrjf':
            schedule = runLRJF();
            break;
    }

    fullSchedule = schedule;
    maxEndTime = schedule.length > 0 ? Math.ceil(Math.max(...schedule.map(item => item.end))) : 10;

    initializeGanttChart(schedule);

    resultsContainer.innerHTML = '<p class="text-center">Animation in progress. Results will be displayed when animation completes.</p>';
}

function initializeGanttChart(schedule) {
    ganttChart.innerHTML = '';

    if (schedule.length === 0) {
        ganttChart.innerHTML = '<p class="text-center p-4">No schedule to display.</p>';
        return;
    }

    resetAnimation();

    const gridContainer = document.createElement('div');
    gridContainer.className = 'relative w-full h-full';

    const processNames = [...new Set(schedule.map(s => s.process))];
    const rowHeight = 40;
    const totalHeight = processNames.length * rowHeight;
    gridContainer.style.height = `${totalHeight + 100}px`; // Increased space for timeline

    const containerWidth = ganttChart.clientWidth - 80;
    const pixelsPerSecond = containerWidth / maxEndTime;
    gridContainer.style.width = `${containerWidth + 80}px`;

    // Timeline below last process row
    const timelineTop = totalHeight + 30; // Adjusted for full visibility
    for (let t = 0; t <= Math.floor(maxEndTime); t++) {
        const timeMarker = document.createElement('div');
        timeMarker.className = `time-marker ${t % 5 === 0 ? 'multiple-five' : ''}`;
        timeMarker.style.left = `${80 + t * pixelsPerSecond}px`;
        timeMarker.style.top = `${timelineTop}px`;
        timeMarker.textContent = t;
        gridContainer.appendChild(timeMarker);

        const gridLine = document.createElement('div');
        gridLine.className = `time-line ${t % 5 === 0 ? 'multiple-five' : ''}`;
        gridLine.style.left = `${80 + t * pixelsPerSecond}px`;
        gridLine.style.top = `0px`;
        gridLine.style.height = `${totalHeight + 20}px`; // Extend below last row
        gridContainer.appendChild(gridLine);
    }

    const animationMarker = document.createElement('div');
    animationMarker.id = 'animationTimeMarker';
    animationMarker.className = 'animation-time-marker';
    animationMarker.style.left = `${80}px`;
    animationMarker.style.height = `${totalHeight + 80}px`; // Extend below timeline
    gridContainer.appendChild(animationMarker);

    const processIndicatorContainer = document.createElement('div');
    processIndicatorContainer.id = 'currentProcessIndicator';
    processIndicatorContainer.innerHTML = 'No process running';
    gridContainer.appendChild(processIndicatorContainer);

    processNames.forEach((processName, index) => {
        const processItems = schedule.filter(item => item.process === processName);

        const label = document.createElement('div');
        label.className = 'absolute p-2 flex items-center justify-center font-bold border-r';
        label.style.left = '0';
        label.style.top = `${index * rowHeight}px`;
        label.style.height = `${rowHeight}px`;
        label.style.width = '80px';
        label.style.zIndex = '10';
        label.style.backgroundColor = 'var(--bg-element)';
        label.style.borderColor = 'var(--border-color)';
        label.textContent = processName;
        gridContainer.appendChild(label);

        const track = document.createElement('div');
        track.className = 'process-track';
        track.style.left = `80px`;
        track.style.top = `${index * rowHeight}px`;
        track.style.width = `${maxEndTime * pixelsPerSecond}px`;
        track.style.height = `${rowHeight}px`;
        gridContainer.appendChild(track);

        processItems.forEach(item => {
            const block = document.createElement('div');
            block.className = `process-block ${item.color} border`;
            block.style.left = `${80 + item.start * pixelsPerSecond}px`;
            block.style.top = `${index * rowHeight}px`;
            block.style.width = `${(item.end - item.start) * pixelsPerSecond}px`;
            block.style.height = `${rowHeight}px`;
            block.style.display = 'none';
            block.dataset.startTime = item.start;
            block.dataset.endTime = item.end;
            block.textContent = processName;
            gridContainer.appendChild(block);
        });
    });

    ganttChart.appendChild(gridContainer);
    window.pixelsPerSecond = pixelsPerSecond;
}

// Calculate and display metrics
function calculateMetrics(schedule) {
    if (schedule.length === 0) {
        resultsContainer.innerHTML = '<p class="text-center">No results to display.</p>';
        return;
    }

    const processGroups = {};
    schedule.forEach(item => {
        if (item.process === 'Idle') return;
        if (!processGroups[item.process]) {
            processGroups[item.process] = [];
        }
        processGroups[item.process].push(item);
    });

    const metrics = {};
    for (const processName in processGroups) {
        const items = processGroups[processName];
        const process = processes.find(p => p.name === processName);
        if (!process) continue;

        items.sort((a, b) => a.start - b.start);
        const firstExecution = items[0];
        const lastExecution = items[items.length - 1];

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

    let totalTurnaroundTime = 0;
    let totalWaitingTime = 0;
    let processCount = Object.keys(metrics).length;

    for (const processName in metrics) {
        totalTurnaroundTime += metrics[processName].turnaroundTime;
        totalWaitingTime += metrics[processName].waitingTime;
    }

    const avgTurnaroundTime = processCount > 0 ? totalTurnaroundTime / processCount : 0;
    const avgWaitingTime = processCount > 0 ? totalWaitingTime / processCount : 0;

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

function init() {
    toggleTimeQuantum();
    if (processes.length === 0) {
        processes = [
            { id: 1, name: 'P1', arrivalTime: 0, burstTime: 5, remainingTime: 5, color: colors[0] },
            { id: 2, name: 'P2', arrivalTime: 1, burstTime: 3, remainingTime: 3, color: colors[1] },
            { id: 3, name: 'P3', arrivalTime: 2, burstTime: 8, remainingTime: 8, color: colors[2] },
            { id: 4, name: 'P4', arrivalTime: 4, burstTime: 4, remainingTime: 4, color: colors[3] }
        ];
        updateProcessTable();
    }
}

window.addEventListener('load', init);