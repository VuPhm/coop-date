import { parseLocalDate, formatLocalDate, getCleanToday, MS_PER_DAY } from './helpers.js';

export function drawTimelineDiagram(nsxStr, hsdStr, returnStr) {
    const board = document.getElementById('diagramBoard');
    const container = document.getElementById('svgContainer');
    board.style.display = 'block';

    const nsx = parseLocalDate(nsxStr);
    const hsd = parseLocalDate(hsdStr);
    const today = getCleanToday(); 

    const totalDays = Math.round((hsd - nsx) / MS_PER_DAY) + 1;
    const todayIndex = Math.round((today - nsx) / MS_PER_DAY) + 1;
    
    const startX = 35; 
    const endX = 565;
    const widthX = endX - startX;
    const y = 65; 

    const getX = (dayIndex) => {
        if (totalDays <= 0) return startX;
        const pct = dayIndex / totalDays;
        return startX + Math.max(0, Math.min(1, pct)) * widthX;
    };

    const todayX = getX(todayIndex);
    const colorSafe = '#006633';
    const colorDanger = '#e20514';
    const colorPast = '#86868b';

    // NHÁNH 1: Sản phẩm ngắn ngày (< 10 ngày) - Giữ nguyên logic tối giản
    if (totalDays < 10) {
        const isExpired = (totalDays - todayIndex) < 0;
        const mainColor = isExpired ? colorDanger : colorSafe;

        container.innerHTML = `
            <svg class="timeline-svg" viewBox="0 0 600 145" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                <line x1="${startX}" y1="${y}" x2="${endX}" y2="${y}" stroke="${mainColor}" stroke-width="8" stroke-linecap="round"/>
                ${todayIndex > 0 ? `<line x1="${startX}" y1="${y}" x2="${Math.min(endX, todayX)}" y2="${y}" stroke="${colorPast}" stroke-width="8" stroke-linecap="round" stroke-opacity="0.85"/>` : ''}
                ${todayIndex >= 0 && todayIndex <= totalDays ? `<line x1="${todayX}" y1="${y - 22}" x2="${todayX}" y2="${y + 22}" stroke="#1c261c" stroke-width="2" stroke-dasharray="3,3"/>` : ''}
                
                <text x="${(startX + endX) / 2}" y="${y - 18}" style="font-size: 14px; font-weight: 800;" fill="${mainColor}" text-anchor="middle">Tổng HSD: ${totalDays} ngày</text>
                
                <circle cx="${startX}" cy="${y}" r="7" fill="#ffffff" stroke="${colorSafe}" stroke-width="3.5" />
                <text x="${startX}" y="${y + 26}" style="font-size: 13px; font-weight: 600;" fill="#1c261c" text-anchor="middle">NSX</text>
                <text x="${startX}" y="${y + 42}" style="font-size: 13px; font-weight: 700;" fill="#667366" text-anchor="middle">${nsxStr.slice(0,5)}</text>
                
                <circle cx="${endX}" cy="${y}" r="7" fill="#ffffff" stroke="${mainColor}" stroke-width="3.5" />
                <text x="${endX}" y="${y + 26}" style="font-size: 13px; font-weight: 800;" fill="${mainColor}" text-anchor="middle">HSD</text>
                <text x="${endX}" y="${y + 42}" style="font-size: 13px; font-weight: 700;" fill="#667366" text-anchor="middle">${hsdStr.slice(0,5)}</text>
                
                ${todayIndex >= 0 && todayIndex <= totalDays ? `
                    <g>
                        <circle cx="${todayX}" cy="${y}" r="5" fill="#1c261c"/>
                        <text x="${todayX}" y="${y - 30}" style="font-size: 13px; font-weight: 800;" text-anchor="middle" fill="#1c261c">Hôm nay (${today.getDate()}/${today.getMonth() + 1})</text>
                    </g>
                ` : ''}
            </svg>
        `;
        return;
    }

    // NHÁNH 2: Sản phẩm dài ngày (>= 10 ngày)
    const dayThreshold20 = Math.round(totalDays * 0.2);
    const dayThreshold40 = Math.round(totalDays * 0.4);
    const mốc_40 = totalDays - dayThreshold40;
    const mốc_20 = totalDays - dayThreshold20;
    const x_40 = getX(mốc_40);
    const x_20 = getX(mốc_20);
    const colorWarning = '#f29200';

    const date40Obj = new Date(nsx.getTime() + (mốc_40 - 1) * MS_PER_DAY);
    const date40Str = formatLocalDate(date40Obj);

    container.innerHTML = `
        <svg class="timeline-svg" viewBox="0 0 600 145" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <line x1="${startX}" y1="${y}" x2="${x_40}" y2="${y}" stroke="${colorSafe}" stroke-width="8" stroke-linecap="butt"/>
            <line x1="${x_40}" y1="${y}" x2="${x_20}" y2="${y}" stroke="${colorWarning}" stroke-width="14" stroke-linecap="butt"/>
            <line x1="${x_20}" y1="${y}" x2="${endX}" y2="${y}" stroke="${colorDanger}" stroke-width="14" stroke-linecap="butt"/>
            
            ${todayIndex > 0 ? `<line x1="${startX}" y1="${y}" x2="${Math.min(x_40, todayX)}" y2="${y}" stroke="${colorPast}" stroke-width="8" stroke-opacity="0.85"/>` : ''}
            ${todayIndex > mốc_40 ? `<line x1="${x_40}" y1="${y}" x2="${Math.min(x_20, todayX)}" y2="${y}" stroke="${colorPast}" stroke-width="14" stroke-opacity="0.85"/>` : ''}
            ${todayIndex > mốc_20 ? `<line x1="${x_20}" y1="${y}" x2="${Math.min(endX, todayX)}" y2="${y}" stroke="${colorPast}" stroke-width="14" stroke-opacity="0.85"/>` : ''}
            ${todayIndex >= 0 && todayIndex <= totalDays ? `<line x1="${todayX}" y1="${y - 22}" x2="${todayX}" y2="${y + 22}" stroke="#1c261c" stroke-width="2" stroke-dasharray="3,3"/>` : ''}

            <text x="${(x_40 + x_20) / 2}" y="${y - 10}" style="font-size: 11px; font-weight: 600;" fill="${colorWarning}" fill-opacity="0.75" text-anchor="middle">${dayThreshold40 - dayThreshold20} ngày</text>
            <text x="${(x_20 + endX) / 2}" y="${y - 10}" style="font-size: 11px; font-weight: 600;" fill="${colorDanger}" fill-opacity="0.75" text-anchor="middle">${dayThreshold20} ngày</text>
            
            <circle cx="${startX}" cy="${y}" r="7" fill="#ffffff" stroke="${colorSafe}" stroke-width="3.5" />
            <text x="${startX}" y="${y + 26}" style="font-size: 13px; font-weight: 600;" fill="#1c261c" text-anchor="middle">NSX</text>
            <text x="${startX}" y="${y + 42}" style="font-size: 13px; font-weight: 700;" fill="#667366" text-anchor="middle">${nsxStr.slice(0,5)}</text>
            
            <circle cx="${x_40}" cy="${y}" r="5" fill="#ffffff" stroke="${colorWarning}" stroke-width="3.5" />
            <text x="${x_40}" y="${y + 26}" style="font-size: 12px; font-weight: 700;" fill="${colorWarning}" text-anchor="middle">Mốc 40%</text>
            <text x="${x_40}" y="${y + 42}" style="font-size: 13px; font-weight: 700;" fill="#667366" text-anchor="middle">${date40Str.slice(0,5)}</text>
            
            <circle cx="${x_20}" cy="${y}" r="7" fill="#ffffff" stroke="${colorDanger}" stroke-width="3.5" />
            <text x="${x_20}" y="${y + 26}" style="font-size: 14px; font-weight: 800;" fill="${colorDanger}" text-anchor="middle">Hạn lùi</text>
            <text x="${x_20}" y="${y + 42}" style="font-size: 13px; font-weight: 700;" fill="#667366" text-anchor="middle">${returnStr.slice(0,5)}</text>
            
            <circle cx="${endX}" cy="${y}" r="7" fill="#ffffff" stroke="#667366" stroke-width="3.5" />
            <text x="${endX}" y="${y + 26}" style="font-size: 13px; font-weight: 600;" fill="#1c261c" text-anchor="middle">HSD</text>
            <text x="${endX}" y="${y + 42}" style="font-size: 13px; font-weight: 700;" fill="#667366" text-anchor="middle">${hsdStr.slice(0,5)}</text>
            
            ${todayIndex >= 0 && todayIndex <= totalDays ? `
                <g>
                    <circle cx="${todayX}" cy="${y}" r="5" fill="#1c261c"/>
                    <text x="${todayX}" y="${y - 30}" style="font-size: 13px; font-weight: 800;" text-anchor="middle" fill="#1c261c">Hôm nay (${today.getDate()}/${today.getMonth() + 1})</text>
                </g>
            ` : ''}
        </svg>
    `;
}
