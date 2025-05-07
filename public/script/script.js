const stationName = document.querySelector('#station-name').textContent

$.ajax({
    url: `/stations/renderGraph/${stationName}`,
    success: renderChart
})

function renderChart(data) {
    new frappe.Chart("#chart", {
        data: data,
        type: "line",
        height: 200,
        colors: ["red", "blue"]
    })
}
