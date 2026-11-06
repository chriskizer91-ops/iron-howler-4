"""The Skitter's top view (F04) packs the body and legs into less length than the side view (F02). These landmarks move each
top-view row front to back so it lands where the side view puts it: one map for the body, one for each pair of legs.
Each map is a list of (row in the top picture as drawn, row it moves to); in between it is piecewise linear, beyond the ends it
carries on in a straight line."""
PPM, TU, TV = 468.89, 3293.5, 470.5          # px per metre; the top view's centre column and its y = 0 row
SIDE_CU = 1411.5
def row_of(side_u): return round(TV - (SIDE_CU - side_u), 1)      # the top row for a side-view column (same scale, y = 0 at TV)
BODY = [(32, row_of(966)), (120, row_of(1006)), (320, row_of(1273)), (615, row_of(1632)), (815, row_of(1790))]  # prong tip, head front, front hip, back hip, shell back
LEGF = [(30, row_of(1048)), (320, row_of(1273))]          # front foot's front edge, front hip
LEGB = [(615, row_of(1632)), (910, row_of(1860))]         # back hip, back foot's back edge
# the leg zones in the top picture as drawn (the Skitter's right side; the left is their mirror about TU)
ZONE_F = [[3425, 200], [3470, 140], [3560, 25], [3752, 25], [3752, 300], [3600, 330], [3560, 350], [3520, 372], [3430, 282]]
ZONE_B = [[3430, 650], [3520, 565], [3560, 585], [3600, 610], [3752, 640], [3752, 915], [3560, 915], [3480, 800], [3420, 700]]

def fwd(M, v):
    """row as drawn -> row in the fixed picture"""
    M = sorted(M)
    for (a, A), (b, B) in zip(M, M[1:]):
        if v <= b or (a, A) == M[-2]: return A + (v - a) * (B - A) / (b - a)
def inv(M, v):
    """row in the fixed picture -> row as drawn"""
    return fwd([(B, A) for A, B in M], v)
def warp_poly(M, poly): return [[u, round(fwd(M, v), 1)] for u, v in poly]
def mirror(poly): return [[2 * TU - u, v] for u, v in poly]
