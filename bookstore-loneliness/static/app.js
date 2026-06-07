let currentData = null;
let svg = null;
let simulation = null;
let nodeScale = 2.5;
let similarityThreshold = 0.3;

const COLORS = {
    deep_reading: "#1a365d",
    family_friendly: "#2f855a",
    internet_famous: "#d69e2e",
    study_oriented: "#742a2a"
};

const TYPE_NAMES = {
    deep_reading: "深度阅读型",
    family_friendly: "亲子型",
    internet_famous: "网红打卡型",
    study_oriented: "教辅型"
};

document.addEventListener("DOMContentLoaded", function () {
    initControls();
    loadData();
});

function initControls() {
    document.getElementById("citySelect").addEventListener("change", function () {
        loadData();
    });

    const thresholdSlider = document.getElementById("similarityThreshold");
    thresholdSlider.addEventListener("input", function () {
        similarityThreshold = parseFloat(this.value);
        document.getElementById("thresholdValue").textContent = similarityThreshold.toFixed(2);
        if (currentData) {
            updateGraph();
        }
    });

    const nodeScaleSlider = document.getElementById("nodeScale");
    nodeScaleSlider.addEventListener("input", function () {
        nodeScale = parseFloat(this.value);
        document.getElementById("nodeScaleValue").textContent = nodeScale.toFixed(1) + "x";
        if (currentData) {
            updateNodeSizes();
        }
    });

    document.getElementById("refreshBtn").addEventListener("click", function () {
        loadData();
    });

    document.getElementById("crawlBtn").addEventListener("click", function () {
        triggerCrawl();
    });

    document.getElementById("closeDetail").addEventListener("click", function () {
        document.getElementById("detailPanel").classList.add("hidden");
    });
}

async function loadData() {
    const city = document.getElementById("citySelect").value;
    showLoading();

    try {
        const response = await fetch(`/api/bookstores?city=${encodeURIComponent(city)}`);
        currentData = await response.json();
        renderGraph();
        updateStats();
        updateTypeStats();
    } catch (error) {
        console.error("加载数据失败:", error);
        document.querySelector(".force-graph").innerHTML =
            '<div class="loading"><span>数据加载失败，请刷新重试</span></div>';
    }
}

async function triggerCrawl() {
    const city = document.getElementById("citySelect").value;
    const btn = document.getElementById("crawlBtn");
    btn.textContent = "爬取中...";
    btn.disabled = true;

    try {
        const response = await fetch("/api/trigger-crawl", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ city: city })
        });
        const data = await response.json();
        alert(`爬取任务已启动: ${data.message}`);
        loadData();
    } catch (error) {
        console.error("触发爬取失败:", error);
    } finally {
        btn.textContent = "🕷️ 开始爬取";
        btn.disabled = false;
    }
}

function showLoading() {
    document.querySelector(".force-graph").innerHTML =
        '<div class="loading"><span>加载中...</span></div>';
}

function renderGraph() {
    const container = document.getElementById("forceGraph");
    container.innerHTML = "";

    const width = container.clientWidth;
    const height = container.clientHeight || 600;

    svg = d3.select("#forceGraph")
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("viewBox", [0, 0, width, height]);

    const defs = svg.append("defs");
    const filter = defs.append("filter")
        .attr("id", "glow")
        .attr("x", "-50%")
        .attr("y", "-50%")
        .attr("width", "200%")
        .attr("height", "200%");
    filter.append("feGaussianBlur")
        .attr("stdDeviation", "3")
        .attr("result", "coloredBlur");
    const feMerge = filter.append("feMerge");
    feMerge.append("feMergeNode").attr("in", "coloredBlur");
    feMerge.append("feMergeNode").attr("in", "SourceGraphic");

    const nodes = currentData.nodes.map(d => ({ ...d }));
    const links = currentData.links
        .filter(l => l.value >= similarityThreshold)
        .map(d => ({ ...d }));

    const link = svg.append("g")
        .attr("class", "links")
        .selectAll("line")
        .data(links)
        .enter()
        .append("line")
        .attr("class", d => d.same_type ? "link link-same-type" : "link")
        .attr("stroke-width", d => Math.sqrt(d.value) * 2);

    const nodeGroup = svg.append("g")
        .attr("class", "nodes")
        .selectAll("g")
        .data(nodes)
        .enter()
        .append("g")
        .attr("class", "node-group")
        .call(d3.drag()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended));

    nodeGroup.append("circle")
        .attr("class", "node-circle")
        .attr("r", d => getNodeRadius(d))
        .attr("fill", d => COLORS[d.type] || "#666")
        .attr("fill-opacity", 0.85)
        .attr("stroke", d => d3.color(COLORS[d.type]).brighter(0.5))
        .attr("stroke-width", 2)
        .style("filter", "url(#glow)")
        .on("mouseover", function (event, d) {
            showTooltip(event, d);
            highlightConnections(d);
        })
        .on("mouseout", function () {
            hideTooltip();
            resetHighlight();
        })
        .on("click", function (event, d) {
            showDetail(d);
        });

    nodeGroup.append("text")
        .attr("class", "node-label")
        .attr("dy", d => -getNodeRadius(d) - 5)
        .text(d => truncateName(d.name, 8));

    simulation = d3.forceSimulation(nodes)
        .force("link", d3.forceLink(links)
            .id(d => d.id)
            .distance(d => 150 - d.value * 80)
            .strength(d => d.value * 0.5))
        .force("charge", d3.forceManyBody().strength(-300))
        .force("center", d3.forceCenter(width / 2, height / 2))
        .force("collision", d3.forceCollide().radius(d => getNodeRadius(d) + 10))
        .on("tick", ticked);

    function ticked() {
        link
            .attr("x1", d => d.source.x)
            .attr("y1", d => d.source.y)
            .attr("x2", d => d.target.x)
            .attr("y2", d => d.target.y);

        nodeGroup
            .attr("transform", d => `translate(${d.x}, ${d.y})`);
    }

    function dragstarted(event, d) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
    }

    function dragged(event, d) {
        d.fx = event.x;
        d.fy = event.y;
    }

    function dragended(event, d) {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
    }

    let tooltip = d3.select("body").append("div")
        .attr("class", "tooltip");

    function showTooltip(event, d) {
        const solitudePercent = (d.solitude_score * 100).toFixed(1);
        tooltip
            .style("left", (event.pageX + 15) + "px")
            .style("top", (event.pageY - 10) + "px")
            .html(`
                <strong>${d.name}</strong><br/>
                类型: ${TYPE_NAMES[d.type]}<br/>
                孤独指数: ${solitudePercent}%<br/>
                评分: ${d.rating}分<br/>
                评论数: ${d.review_count}条
            `)
            .classed("visible", true);
    }

    function hideTooltip() {
        tooltip.classed("visible", false);
    }

    function highlightConnections(d) {
        const connectedIds = new Set();
        connectedIds.add(d.id);

        links.forEach(l => {
            if (l.source.id === d.id) connectedIds.add(l.target.id);
            if (l.target.id === d.id) connectedIds.add(l.source.id);
        });

        d3.selectAll(".node-circle")
            .attr("fill-opacity", n => connectedIds.has(n.id) ? 1 : 0.2);

        d3.selectAll(".node-label")
            .attr("fill-opacity", n => connectedIds.has(n.id) ? 1 : 0.2);

        d3.selectAll(".link")
            .attr("stroke-opacity", l =>
                (l.source.id === d.id || l.target.id === d.id) ? 0.8 : 0.1
            );
    }

    function resetHighlight() {
        d3.selectAll(".node-circle").attr("fill-opacity", 0.85);
        d3.selectAll(".node-label").attr("fill-opacity", 1);
        d3.selectAll(".link").attr("stroke-opacity", 0.6);
    }

    window.addEventListener("resize", function () {
        if (currentData) {
            renderGraph();
        }
    });
}

function updateGraph() {
    if (!currentData) return;
    renderGraph();
}

function updateNodeSizes() {
    if (!svg || !currentData) return;

    svg.selectAll(".node-circle")
        .attr("r", d => getNodeRadius(d));

    svg.selectAll(".node-label")
        .attr("dy", d => -getNodeRadius(d) - 5);

    simulation.force("collision", d3.forceCollide().radius(d => getNodeRadius(d) + 10));
    simulation.alpha(0.3).restart();
}

function getNodeRadius(d) {
    const baseSize = 8;
    const solitudeSize = d.solitude_score * 25;
    return (baseSize + solitudeSize) * nodeScale;
}

function truncateName(name, maxLength) {
    if (name.length <= maxLength) return name;
    return name.substring(0, maxLength - 1) + "…";
}

function updateStats() {
    const stats = currentData.city_stats;
    document.getElementById("avgSolitude").textContent = (stats.avg_solitude * 100).toFixed(1) + "%";
    document.getElementById("highSolitude").textContent = stats.high_solitude_count;
    document.getElementById("totalBookstores").textContent = stats.total_bookstores;
}

function updateTypeStats() {
    const typeStats = currentData.type_stats.by_type;
    const container = document.getElementById("typeStats");
    container.innerHTML = "";

    const typeOrder = ["deep_reading", "family_friendly", "internet_famous", "study_oriented"];

    typeOrder.forEach(type => {
        const data = typeStats[type];
        if (!data) return;

        const item = document.createElement("div");
        item.className = "type-stat-item";
        item.innerHTML = `
            <span class="legend-color" style="background: ${COLORS[type]}; width: 10px; height: 10px; border-radius: 2px; display: inline-block;"></span>
            <div class="type-stat-bar">
                <div class="type-stat-fill" style="width: ${data.percentage}%; background: ${COLORS[type]};"></div>
            </div>
            <span class="type-stat-text">${data.count}家</span>
        `;
        container.appendChild(item);
    });
}

function showDetail(d) {
    const panel = document.getElementById("detailPanel");
    panel.classList.remove("hidden");

    document.getElementById("detailName").textContent = d.name;
    document.getElementById("detailType").textContent = TYPE_NAMES[d.type];
    document.getElementById("detailType").style.color = COLORS[d.type];
    document.getElementById("detailSolitude").textContent = (d.solitude_score * 100).toFixed(1) + "%";
    document.getElementById("detailRating").textContent = d.rating + " 分";
    document.getElementById("detailAddress").textContent = d.address;

    const totalScore = d.solitude_score + d.family_score + d.student_score + d.internet_famous_score;

    const scores = {
        solitude: totalScore > 0 ? (d.solitude_score / totalScore * 100).toFixed(1) : 0,
        family: totalScore > 0 ? (d.family_score / totalScore * 100).toFixed(1) : 0,
        student: totalScore > 0 ? (d.student_score / totalScore * 100).toFixed(1) : 0,
        internet: totalScore > 0 ? (d.internet_famous_score / totalScore * 100).toFixed(1) : 0
    };

    setTimeout(() => {
        document.getElementById("barSolitude").style.width = scores.solitude + "%";
        document.getElementById("barFamily").style.width = scores.family + "%";
        document.getElementById("barStudent").style.width = scores.student + "%";
        document.getElementById("barInternet").style.width = scores.internet + "%";
    }, 50);

    document.getElementById("valSolitude").textContent = scores.solitude + "%";
    document.getElementById("valFamily").textContent = scores.family + "%";
    document.getElementById("valStudent").textContent = scores.student + "%";
    document.getElementById("valInternet").textContent = scores.internet + "%";
}
