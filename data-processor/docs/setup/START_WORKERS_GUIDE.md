# 🚀 MicroCrop Workers - Quick Start Guide

## ✅ Worker Tested Successfully!

Your Celery worker just started successfully and connected to Redis! 

## 🎯 How to Run All Services

You need to run 3 services simultaneously. Here are your options:

### Option 1: Use 3 Separate Terminal Windows (Recommended)

**Terminal 1 - Worker:**
```bash
cd /Users/onchainchef/Desktop/microcrop-setup/data-processor
./start_worker.sh
```

**Terminal 2 - Beat Scheduler:**
```bash
cd /Users/onchainchef/Desktop/microcrop-setup/data-processor
./start_beat.sh
```

**Terminal 3 - Flower Dashboard:**
```bash
cd /Users/onchainchef/Desktop/microcrop-setup/data-processor
./start_flower.sh
```

Then open your browser to: **http://localhost:5555**

---

### Option 2: Use tmux (All in one terminal)

```bash
cd /Users/onchainchef/Desktop/microcrop-setup/data-processor

# Start tmux session
tmux new-session -d -s microcrop

# Window 0: Worker
tmux send-keys -t microcrop:0 './start_worker.sh' C-m

# Window 1: Beat
tmux new-window -t microcrop:1
tmux send-keys -t microcrop:1 './start_beat.sh' C-m

# Window 2: Flower
tmux new-window -t microcrop:2
tmux send-keys -t microcrop:2 './start_flower.sh' C-m

# Attach to session
tmux attach -t microcrop
```

**tmux Commands:**
- `Ctrl+b` then `0/1/2` - Switch between windows
- `Ctrl+b` then `d` - Detach (keeps running)
- `tmux attach -t microcrop` - Reattach
- `tmux kill-session -t microcrop` - Stop all

---

### Option 3: Use screen (Alternative)

```bash
cd /Users/onchainchef/Desktop/microcrop-setup/data-processor

# Start worker in background
screen -dmS worker bash -c './start_worker.sh'

# Start beat in background
screen -dmS beat bash -c './start_beat.sh'

# Start flower in background (or foreground)
./start_flower.sh
```

**screen Commands:**
- `screen -ls` - List running sessions
- `screen -r worker` - Attach to worker
- `Ctrl+a` then `d` - Detach
- `screen -X -S worker quit` - Stop worker

---

### Option 4: Background with nohup (Quick & Simple)

```bash
cd /Users/onchainchef/Desktop/microcrop-setup/data-processor

# Start all in background
nohup ./start_worker.sh > logs/worker.log 2>&1 &
nohup ./start_beat.sh > logs/beat.log 2>&1 &
nohup ./start_flower.sh > logs/flower.log 2>&1 &

# Check they're running
ps aux | grep celery

# View logs
tail -f logs/worker.log
tail -f logs/beat.log
tail -f logs/flower.log

# Stop all (when needed)
pkill -f "celery.*worker"
pkill -f "celery.*beat"
pkill -f "celery.*flower"
```

---

## 🧪 Testing After Startup

Once all three services are running, test with:

```bash
cd /Users/onchainchef/Desktop/microcrop-setup/data-processor
source venv/bin/activate
export PYTHONPATH=$PWD:$PYTHONPATH

# Test blockchain health check
python -c "
from src.workers.blockchain_tasks import blockchain_health_check
result = blockchain_health_check.apply_async(queue='blockchain')
print(f'✅ Health check task queued: {result.id}')
print('Check Flower at http://localhost:5555 to see the result')
"
```

---

## 🌸 Accessing Flower Dashboard

Once Flower is running, visit:
- **URL**: http://localhost:5555
- **Features**: 
  - Real-time task monitoring
  - Worker status
  - Task history
  - Queue statistics
  - Task execution times

---

## 📊 What Each Service Does

### 1. Worker (`start_worker.sh`)
- Processes tasks from queues
- Handles: blockchain, weather, satellite, damage, default
- 4 concurrent processes
- Auto-restarts failed tasks

### 2. Beat (`start_beat.sh`)
- Schedules periodic tasks
- Runs every 2-60 minutes depending on task
- Auto-submits pending data
- Monitors health

### 3. Flower (`start_flower.sh`)
- Web-based monitoring dashboard
- Real-time task visibility
- Performance metrics
- Queue management

---

## ✅ What You Just Verified

From the test run:
- ✅ Celery connects to Redis successfully
- ✅ Worker process spawns correctly
- ✅ All 5 queues registered properly
- ✅ Task events monitoring enabled
- ✅ Ready to process tasks

---

## 🎯 Recommended: Use Option 1 (3 Terminal Windows)

This is the easiest for development:
1. You can see logs in real-time
2. Easy to restart individual services
3. Simple Ctrl+C to stop
4. No need to learn tmux/screen

**Ready to proceed?** Open 3 terminal windows and run the commands from Option 1!
